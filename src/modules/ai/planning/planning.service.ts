import { Injectable, Logger } from '@nestjs/common';
import { ItineraryItem, ItineraryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { GeminiService } from './gemini.service';

export interface AiItineraryItem {
  day?: number;
  order?: number;
  title: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  estimatedCost?: number;
}

export interface AiItineraryPlan {
  title?: string;
  description?: string;
  items?: AiItineraryItem[];
}

export interface AiSingleItemUpdate {
  title: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  estimatedCost?: number;
}

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async generateItinerary(params: {
    groupId: string;
    destination: string;
    duration: number;
    budget?: number;
    interests?: string[];
    requestedBy: string;
  }) {
    const prompt = `
Generate a detailed ${params.duration}-day travel itinerary for ${params.destination}.

Group preferences:
- Duration: ${params.duration} days
- Budget: ${params.budget ? `$${params.budget}` : 'flexible'}
- Interests: ${params.interests?.join(', ') ?? 'general tourism'}

Return exactly a JSON object (no markdown formatting) with the following structure:
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

    const plan = await this.geminiService.generateJsonContent<AiItineraryPlan>(prompt);

    if (!plan || !plan.title || !plan.items) {
      throw new Error('Failed to parse AI itinerary response: Invalid structure');
    }

    return this.prisma.itinerary.create({
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
            data: plan.items.map((item: AiItineraryItem) => {
              const startDate = new Date(); // Using today as base
              const targetDate = new Date(startDate);
              targetDate.setDate(startDate.getDate() + ((item.day || 1) - 1));
              const dateStr = targetDate.toISOString().split('T')[0];

              return {
                title: item.title,
                description: item.description,
                location: item.location,
                startTime: new Date(`${dateStr}T${item.startTime || '09:00'}:00Z`),
                endTime: new Date(`${dateStr}T${item.endTime || '11:00'}:00Z`),
                estimatedCost: item.estimatedCost,
                orderNo: (item.order || 1) + ((item.day || 1) - 1) * 100,
              };
            }),
          },
        },
      },
      include: { items: { orderBy: { orderNo: 'asc' } } },
    });
  }

  async modifySingleItem(item: ItineraryItem, userPrompt: string) {
    const prompt = `
You are an expert travel planner AI.
The user wants to modify a specific itinerary activity.
Current Activity Details:
- Title: ${item.title}
- Description: ${item.description || 'N/A'}
- Location: ${item.location || 'N/A'}
- Start Time: ${item.startTime.toISOString().substring(11, 16)}
- End Time: ${item.endTime.toISOString().substring(11, 16)}
- Estimated Cost: ${item.estimatedCost ?? 'N/A'}

User Request: "${userPrompt}"

Based on the user's request, adjust the activity details. Return ONLY a valid JSON object with the exact following structure (do NOT wrap in markdown block):
{
  "title": "Updated title",
  "description": "Updated details",
  "location": "Updated location",
  "startTime": "HH:mm",
  "endTime": "HH:mm",
  "estimatedCost": 0
}`;

    const newPlan = await this.geminiService.generateJsonContent<AiSingleItemUpdate>(prompt);
    if (!newPlan || !newPlan.title) {
      throw new Error('Failed to parse AI modification response');
    }
    return newPlan;
  }

  async modifyEntireItinerary(
    itinerary: Prisma.ItineraryGetPayload<{ include: { items: true } }>,
    userPrompt: string,
    focusedItemTitle?: string,
  ) {
    const currentItemsStr = itinerary.items
      .map(
        (i: ItineraryItem) => `
- Day ${Math.floor(i.orderNo / 100) + 1} | ${i.startTime.toISOString().substring(11, 16)} - ${i.endTime.toISOString().substring(11, 16)}: ${i.title} (Location: ${i.location || 'N/A'}, Cost: ${i.estimatedCost || 0})
`,
      )
      .join('');

    const contextInstruction = focusedItemTitle
      ? `\nNote: The user triggered this request while focusing on the activity: "${focusedItemTitle}". You may modify, delete, or shift this activity and any surrounding activities to fulfill the request.`
      : '';

    const prompt = `
You are an expert travel planner AI.
The user wants to modify their entire itinerary.${contextInstruction}
Current Itinerary Overview:
Title: ${itinerary.title}
Destination: ${itinerary.destination}
Activities:
${currentItemsStr}

User Request: "${userPrompt}"

Please rewrite the itinerary activities to satisfy the user's request. Return ONLY a valid JSON object with the exact following structure (do NOT wrap in markdown block):
{
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

    const newPlan = await this.geminiService.generateJsonContent<{ items: AiItineraryItem[] }>(
      prompt,
    );
    if (!newPlan || !newPlan.items) {
      throw new Error('Failed to parse AI entire plan modification response');
    }
    return newPlan.items;
  }
}
