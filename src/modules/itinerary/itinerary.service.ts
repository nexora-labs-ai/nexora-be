import { Injectable } from '@nestjs/common';
import { ItineraryStatus, Prisma } from '@prisma/client';
import { BusinessRuleError, NotFoundError } from '../../shared/common/domain-errors';
import { PrismaService } from '../../shared/database/prisma.service';
import { AiItineraryItem, PlanningService } from '../ai/planning/planning.service';
import { Group } from '../groups/domain/group.entity';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { CreateItineraryItemDto, UpdateItineraryItemDto } from './dto/itinerary-item.dto';

@Injectable()
export class ItineraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planningService: PlanningService,
  ) {}

  private async assertItineraryAccess(itineraryId: string, userId: string) {
    const it = await this.prisma.itinerary.findUnique({
      where: { id: itineraryId },
      select: { id: true, groupId: true },
    });
    if (!it) throw new NotFoundError('Itinerary', itineraryId);

    const members = await this.prisma.groupMember.findMany({
      where: { groupId: it.groupId, leftAt: null },
      select: { userId: true, role: true },
    });

    new Group(it.groupId, '', '', members).assertMember(userId);
    return it;
  }

  async getGroupItineraries(groupId: string) {
    return this.prisma.itinerary.findMany({
      where: { groupId },
      include: { items: { orderBy: [{ startTime: 'asc' }, { orderNo: 'asc' }] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createItinerary(groupId: string, userId: string, dto: CreateItineraryDto) {
    return this.prisma.itinerary.create({
      data: {
        groupId,
        createdBy: userId,
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
        destination: dto.destination ?? 'Unknown Destination',
        status: ItineraryStatus.DRAFT,
      },
    });
  }

  async generateAiItinerary(
    groupId: string,
    params: {
      destination: string;
      duration: number;
      budget?: number;
      interests?: string[];
      requestedBy: string;
    },
  ) {
    return this.planningService.generateItinerary({
      groupId,
      ...params,
    });
  }

  async publishItinerary(id: string, userId: string) {
    await this.assertItineraryAccess(id, userId);

    return this.prisma.itinerary.update({
      where: { id },
      data: { status: ItineraryStatus.PUBLISHED },
    });
  }

  async createItineraryItem(itineraryId: string, dto: CreateItineraryItemDto, userId: string) {
    await this.assertItineraryAccess(itineraryId, userId);

    // Determine orderNo
    let orderNo = dto.orderNo;
    if (orderNo === undefined) {
      const lastItem = await this.prisma.itineraryItem.findFirst({
        where: { itineraryId },
        orderBy: { orderNo: 'desc' },
      });
      orderNo = lastItem ? lastItem.orderNo + 1 : 1;
    }

    let estimatedCost = null;
    if (dto.estimatedCost !== undefined && dto.estimatedCost !== null) {
      estimatedCost = new Prisma.Decimal(dto.estimatedCost).toDecimalPlaces(
        2,
        Prisma.Decimal.ROUND_HALF_UP,
      );
    }

    return this.prisma.itineraryItem.create({
      data: {
        itineraryId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        estimatedCost,
        orderNo,
        notes: dto.notes,
      },
    });
  }

  private async applyCollisionBasedShift(
    tx: Prisma.TransactionClient,
    itineraryId: string,
    updatedItem: { id: string; startTime: Date; endTime: Date },
  ) {
    // Get all items on the SAME DAY (by UTC date string)
    const targetDateStr = updatedItem.startTime.toISOString().split('T')[0];

    const allItems = await tx.itineraryItem.findMany({
      where: { itineraryId },
      orderBy: { startTime: 'asc' },
    });

    const subsequentItems = allItems.filter(
      (item) =>
        item.startTime.toISOString().split('T')[0] === targetDateStr &&
        item.id !== updatedItem.id &&
        item.startTime >= updatedItem.startTime,
    );

    let currentEndTime = updatedItem.endTime;

    for (const item of subsequentItems) {
      if (item.startTime < currentEndTime) {
        const overlapMs = currentEndTime.getTime() - item.startTime.getTime();
        const newStartTime = new Date(item.startTime.getTime() + overlapMs);
        const newEndTime = new Date(item.endTime.getTime() + overlapMs);

        await tx.itineraryItem.update({
          where: { id: item.id },
          data: { startTime: newStartTime, endTime: newEndTime },
        });

        currentEndTime = newEndTime;
      } else {
        // No collision, stop ripple
        break;
      }
    }
  }

  async updateItineraryItem(
    itineraryId: string,
    itemId: string,
    dto: UpdateItineraryItemDto,
    userId: string,
  ) {
    await this.assertItineraryAccess(itineraryId, userId);

    const item = await this.prisma.itineraryItem.findUnique({ where: { id: itemId } });
    if (!item || item.itineraryId !== itineraryId) {
      throw new NotFoundError('ItineraryItem', itemId);
    }

    const newStart = dto.startTime ? new Date(dto.startTime) : item.startTime;
    const newEnd = dto.endTime ? new Date(dto.endTime) : item.endTime;
    if (newEnd.getTime() <= newStart.getTime()) {
      throw new BusinessRuleError('endTime must be after startTime');
    }

    let estimatedCost = item.estimatedCost;
    if (dto.estimatedCost !== undefined && dto.estimatedCost !== null) {
      estimatedCost = new Prisma.Decimal(dto.estimatedCost).toDecimalPlaces(
        2,
        Prisma.Decimal.ROUND_HALF_UP,
      );
    } else if (dto.estimatedCost === null) {
      estimatedCost = null;
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.itineraryItem.update({
        where: { id: itemId },
        data: {
          title: dto.title,
          description: dto.description,
          location: dto.location,
          startTime: newStart,
          endTime: newEnd,
          estimatedCost,
          orderNo: dto.orderNo,
          notes: dto.notes,
          travelTime: dto.travelTime,
        },
      });

      await this.applyCollisionBasedShift(tx, itineraryId, updatedItem);

      return updatedItem;
    });
  }

  async deleteItineraryItem(itineraryId: string, itemId: string, userId: string) {
    await this.assertItineraryAccess(itineraryId, userId);

    const item = await this.prisma.itineraryItem.findUnique({ where: { id: itemId } });
    if (!item || item.itineraryId !== itineraryId) {
      throw new NotFoundError('ItineraryItem', itemId);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.itineraryItem.delete({ where: { id: itemId } });
      // In collision-based logic, deleting an item simply leaves a gap. We don't pull items back.
      return { success: true };
    });
  }

  async aiEditItineraryItem(itineraryId: string, itemId: string, prompt: string, userId: string) {
    await this.assertItineraryAccess(itineraryId, userId);

    const item = await this.prisma.itineraryItem.findUnique({ where: { id: itemId } });
    if (!item || item.itineraryId !== itineraryId) throw new NotFoundError('ItineraryItem', itemId);

    const itinerary = await this.prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: { items: { orderBy: { orderNo: 'asc' } } },
    });
    if (!itinerary) throw new NotFoundError('Itinerary', itineraryId);

    const newItems = await this.planningService.modifyEntireItinerary(
      itinerary,
      prompt,
      item.title,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.itineraryItem.deleteMany({ where: { itineraryId } });

      await tx.itineraryItem.createMany({
        data: newItems.map((aiItem: AiItineraryItem) => {
          const startDate = itinerary.startDate ? new Date(itinerary.startDate) : new Date();
          const targetDate = new Date(startDate);
          targetDate.setDate(startDate.getDate() + ((aiItem.day || 1) - 1));
          const dateStr = targetDate.toISOString().split('T')[0];

          return {
            itineraryId,
            title: aiItem.title,
            description: aiItem.description,
            location: aiItem.location,
            startTime: new Date(`${dateStr}T${aiItem.startTime || '09:00'}:00Z`),
            endTime: new Date(`${dateStr}T${aiItem.endTime || '11:00'}:00Z`),
            estimatedCost: aiItem.estimatedCost,
            orderNo: (aiItem.order || 1) + ((aiItem.day || 1) - 1) * 100,
          };
        }),
      });
    });

    return { success: true };
  }

  async aiEditEntireItinerary(itineraryId: string, prompt: string, userId: string) {
    await this.assertItineraryAccess(itineraryId, userId);

    const itinerary = await this.prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: { items: { orderBy: { orderNo: 'asc' } } },
    });
    if (!itinerary) throw new NotFoundError('Itinerary', itineraryId);

    const newItems = await this.planningService.modifyEntireItinerary(itinerary, prompt);

    await this.prisma.$transaction(async (tx) => {
      await tx.itineraryItem.deleteMany({ where: { itineraryId } });

      await tx.itineraryItem.createMany({
        data: newItems.map((item: AiItineraryItem) => {
          const startDate = itinerary.startDate ? new Date(itinerary.startDate) : new Date();
          const targetDate = new Date(startDate);
          targetDate.setDate(startDate.getDate() + ((item.day || 1) - 1));
          const dateStr = targetDate.toISOString().split('T')[0];

          return {
            itineraryId,
            title: item.title,
            description: item.description,
            location: item.location,
            startTime: new Date(`${dateStr}T${item.startTime || '09:00'}:00Z`),
            endTime: new Date(`${dateStr}T${item.endTime || '11:00'}:00Z`),
            estimatedCost: item.estimatedCost,
            orderNo: (item.order || 1) + ((item.day || 1) - 1) * 100,
          };
        }),
      });
    });

    return { success: true };
  }
}
