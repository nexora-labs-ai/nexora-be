import { Inject, Injectable, Logger } from '@nestjs/common';
import { ItineraryStatus } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AI_PORT, AiPort } from '../../../shared/infrastructure/ports/ai.port';
import { REALTIME_EVENTS } from '../../../shared/realtime/realtime.gateway';
import { RealtimeService } from '../../../shared/realtime/realtime.service';

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(
    @Inject(AI_PORT) private readonly aiPort: AiPort,
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async generateItinerary(params: {
    groupId: string;
    destination: string;
    duration: number;
    budget?: number;
    interests?: string[];
    requestedBy: string;
  }): Promise<void> {
    const prompt = `
Generate a detailed ${params.duration}-day travel itinerary for ${params.destination}.

Group preferences:
- Duration: ${params.duration} days
- Budget: ${params.budget ? `$${params.budget}` : 'flexible'}
- Interests: ${params.interests?.join(', ') ?? 'general tourism'}

Return as JSON:
{
  "title": "Itinerary title",
  "description": "Overview",
  "items": [
    {
      "day": 1,
      "order": 1,
      "title": "Activity title",
      "description": "Details",
      "location": "Place name",
      "startTime": "09:00",
      "endTime": "11:00",
      "estimatedCost": 50
    }
  ]
}`;

    const response = await this.aiPort.complete({ userPrompt: prompt, temperature: 0.7 });

    let plan: {
      title: string;
      description: string;
      items: Array<{
        day: number;
        order: number;
        title: string;
        description: string;
        location: string;
        estimatedCost?: number;
        startTime?: string;
        endTime?: string;
      }>;
    };

    try {
      plan = JSON.parse(response.content);
    } catch {
      this.logger.error('Failed to parse AI itinerary response');
      return;
    }

    await this.prisma.itinerary.create({
      data: {
        groupId: params.groupId,
        title: plan.title,
        description: plan.description,
        destination: params.destination,
        startDate: new Date(),
        endDate: new Date(Date.now() + params.duration * 24 * 60 * 60 * 1000),
        status: ItineraryStatus.DRAFT,
        createdBy: params.requestedBy,
        items: {
          createMany: {
            data: plan.items.map((item) => ({
              title: item.title,
              description: item.description,
              location: item.location,
              estimatedCost: item.estimatedCost,
              orderNo: item.order + (item.day - 1) * 100,
              startTime: new Date(`1970-01-01T${item.startTime || '09:00'}:00Z`),
              endTime: new Date(`1970-01-01T${item.endTime || '10:00'}:00Z`),
            })),
          },
        },
      },
    });

    // Notify the group
    this.realtimeService.emitToGroup(params.groupId, REALTIME_EVENTS.ITINERARY_READY, {
      groupId: params.groupId,
      destination: params.destination,
    });
  }
}
