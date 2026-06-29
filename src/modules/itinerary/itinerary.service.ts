import { Injectable } from '@nestjs/common';
import { ItineraryStatus } from '@prisma/client';
import { NotFoundError } from '../../shared/common/domain-errors';
import { PrismaService } from '../../shared/database/prisma.service';
import { AiItineraryItem, PlanningService } from '../ai/planning/planning.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { CreateItineraryItemDto, UpdateItineraryItemDto } from './dto/itinerary-item.dto';

@Injectable()
export class ItineraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planningService: PlanningService,
  ) {}

  async getGroupItineraries(groupId: string) {
    return this.prisma.itinerary.findMany({
      where: { groupId },
      include: { items: { orderBy: { orderNo: 'asc' } } },
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
    // Generate AI itinerary synchronously
    return this.planningService.generateItinerary({
      groupId,
      ...params,
    });
  }

  async publishItinerary(id: string) {
    const itinerary = await this.prisma.itinerary.findUnique({ where: { id } });
    if (!itinerary) throw new NotFoundError('Itinerary', id);

    return this.prisma.itinerary.update({
      where: { id },
      data: { status: ItineraryStatus.PUBLISHED },
    });
  }

  async createItineraryItem(itineraryId: string, dto: CreateItineraryItemDto) {
    // Determine orderNo
    let orderNo = dto.orderNo;
    if (orderNo === undefined) {
      const lastItem = await this.prisma.itineraryItem.findFirst({
        where: { itineraryId },
        orderBy: { orderNo: 'desc' },
      });
      orderNo = lastItem ? lastItem.orderNo + 1 : 1;
    }

    return this.prisma.itineraryItem.create({
      data: {
        itineraryId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        estimatedCost: dto.estimatedCost,
        orderNo,
        notes: dto.notes,
      },
    });
  }

  async updateItineraryItem(itineraryId: string, itemId: string, dto: UpdateItineraryItemDto) {
    const item = await this.prisma.itineraryItem.findUnique({ where: { id: itemId } });
    if (!item || item.itineraryId !== itineraryId) {
      throw new NotFoundError('ItineraryItem', itemId);
    }

    let deltaMs = 0;
    // Calculate delta if endTime changes, to shift subsequent items
    if (dto.endTime) {
      const newEndTime = new Date(dto.endTime).getTime();
      const oldEndTime = item.endTime.getTime();
      deltaMs = newEndTime - oldEndTime;
    } else if (dto.startTime && !dto.endTime) {
      // If only startTime changed but duration is same, shift by startTime difference
      const newStartTime = new Date(dto.startTime).getTime();
      const oldStartTime = item.startTime.getTime();
      deltaMs = newStartTime - oldStartTime;
    }

    const updatedItem = await this.prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        estimatedCost: dto.estimatedCost,
        orderNo: dto.orderNo,
        notes: dto.notes,
      },
    });

    if (deltaMs !== 0) {
      // Shift all subsequent items
      const intervalStr = `${deltaMs} milliseconds`;
      await this.prisma.$executeRaw`
        UPDATE "itinerary_items"
        SET "startTime" = "startTime" + ${intervalStr}::interval,
            "endTime" = "endTime" + ${intervalStr}::interval
        WHERE "itinerary_id" = ${itineraryId}::uuid
          AND "order_no" > ${item.orderNo}
      `;
    }

    return updatedItem;
  }

  async deleteItineraryItem(itineraryId: string, itemId: string) {
    const item = await this.prisma.itineraryItem.findUnique({ where: { id: itemId } });
    if (!item || item.itineraryId !== itineraryId) {
      throw new NotFoundError('ItineraryItem', itemId);
    }

    // Delete item
    await this.prisma.itineraryItem.delete({ where: { id: itemId } });

    // Calculate duration of the deleted item
    const durationMs = item.endTime.getTime() - item.startTime.getTime();

    // Shift subsequent items backward
    const intervalStr = `-${durationMs} milliseconds`;
    await this.prisma.$executeRaw`
      UPDATE "itinerary_items"
      SET "startTime" = "startTime" + ${intervalStr}::interval,
          "endTime" = "endTime" + ${intervalStr}::interval
      WHERE "itinerary_id" = ${itineraryId}::uuid
        AND "order_no" > ${item.orderNo}
    `;

    return { success: true };
  }

  async aiEditItineraryItem(itineraryId: string, itemId: string, prompt: string) {
    const item = await this.prisma.itineraryItem.findUnique({ where: { id: itemId } });
    if (!item || item.itineraryId !== itineraryId) throw new NotFoundError('ItineraryItem', itemId);

    const newFields = await this.planningService.modifySingleItem(item, prompt);

    const dto: UpdateItineraryItemDto = {
      title: newFields.title,
      description: newFields.description,
      location: newFields.location,
      estimatedCost: newFields.estimatedCost,
    };

    if (newFields.startTime) {
      const parts = newFields.startTime.split(':');
      const start = new Date(item.startTime);
      start.setUTCHours(
        Number.parseInt(parts[0] || '0', 10),
        Number.parseInt(parts[1] || '0', 10),
        0,
        0,
      );
      dto.startTime = start.toISOString();
    }
    if (newFields.endTime) {
      const parts = newFields.endTime.split(':');
      const end = new Date(item.endTime);
      end.setUTCHours(
        Number.parseInt(parts[0] || '0', 10),
        Number.parseInt(parts[1] || '0', 10),
        0,
        0,
      );
      dto.endTime = end.toISOString();
    }

    return this.updateItineraryItem(itineraryId, itemId, dto);
  }

  async aiEditEntireItinerary(itineraryId: string, prompt: string) {
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
