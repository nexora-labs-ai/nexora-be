import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ItineraryStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { NotFoundError } from '../../shared/common/domain-errors';
import { PrismaService } from '../../shared/database/prisma.service';
import { JOB_NAMES, QUEUES } from '../../shared/queue/queue.constants';
import { CreateItineraryDto } from './dto/create-itinerary.dto';

@Injectable()
export class ItineraryService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.AI_JOBS) private readonly aiQueue: Queue,
  ) {}

  async getGroupItineraries(groupId: string) {
    return this.prisma.itinerary.findMany({
      where: { groupId },
      include: { items: { orderBy: { orderNo: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createItinerary(groupId: string, dto: CreateItineraryDto) {
    return this.prisma.itinerary.create({
      data: {
        groupId,
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        destination: dto.destination,
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
    // Queue AI generation job
    await this.aiQueue.add(JOB_NAMES.GENERATE_ITINERARY, {
      groupId,
      ...params,
    });

    return { message: 'Itinerary generation started. You will be notified when ready.' };
  }

  async publishItinerary(id: string) {
    const itinerary = await this.prisma.itinerary.findUnique({ where: { id } });
    if (!itinerary) throw new NotFoundError('Itinerary', id);

    return this.prisma.itinerary.update({
      where: { id },
      data: { status: ItineraryStatus.PUBLISHED },
    });
  }
}
