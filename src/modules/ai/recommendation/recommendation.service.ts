import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { RecommendationType } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { GeminiService } from '../providers/gemini.service';

@Injectable()
export class RecommendationAiService {
  private readonly logger = new Logger(RecommendationAiService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async generateExpenseRecommendations(groupId: string): Promise<void> {
    // Fetch context data
    const [expenses, membersCount, owner] = await Promise.all([
      this.prisma.expense.findMany({
        where: { groupId, deletedAt: null },
        include: { category: true, splits: true },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      this.prisma.groupMember.count({ where: { groupId } }),
      this.prisma.groupMember.findFirst({ where: { groupId, role: 'OWNER' } }),
    ]);

    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const byCategory = expenses.reduce(
      (acc, e) => {
        const cat = e.category?.name ?? 'Other';
        acc[cat] = (acc[cat] ?? 0) + Number(e.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    const prompt = `
Analyze the following group expense data and provide 3-5 actionable recommendations:

Group: ${membersCount} members
Total spent: ${totalSpent}
Spending by category: ${JSON.stringify(byCategory, null, 2)}

Provide recommendations in JSON format:
[
  {
    "type": "RESTAURANT|CAFE|HOTEL|ACTIVITY|ITINERARY",
    "title": "Short title",
    "content": "Detailed recommendation",
    "priority": "high|medium|low"
  }
]

Return only valid JSON.`;

    let recommendations: Array<{ type: string; title: string; content: string; priority: string }>;
    try {
      recommendations = await this.geminiService.generateJsonContent(prompt);
    } catch {
      this.logger.error('Failed to parse AI recommendations');
      return;
    }

    // Owner is already fetched at the beginning of the function
    if (!owner) {
      this.logger.error('Cannot generate recommendations without a group owner');
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.recommendation.createMany({
      data: recommendations.map((r) => ({
        groupId,
        createdBy: owner.userId,
        type:
          RecommendationType[r.type.toUpperCase() as keyof typeof RecommendationType] ||
          RecommendationType.ACTIVITY,
        title: r.title,
        content: { body: r.content, priority: r.priority },
        expiresAt,
      })),
    });
  }

  async generateBudgetAnalysis(groupId: string): Promise<Record<string, unknown>> {
    const expenses = await this.prisma.expense.findMany({
      where: { groupId, deletedAt: null },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const prompt = `
Analyze these expenses and return a budget analysis in JSON:
${JSON.stringify(expenses.map((e) => ({ amount: e.amount, category: e.category?.name, date: e.date })))}

Return JSON with: { summary, trends, topCategories, savingOpportunities, projectedMonthlySpend }`;

    try {
      return await this.geminiService.generateJsonContent(prompt);
    } catch {
      return { error: 'Analysis failed' };
    }
  }

  async generatePlacesRecommendations(
    groupId: string,
    userInput: string,
    location: string,
    createdBy: string,
    batchId: string,
  ) {
    const prompt = `
Generate 3-5 place recommendations for a group based on this request: "${userInput}".
The location is strictly: "${location}".
CRITICAL: ALL recommendations MUST strictly be located in "${location}". Do not recommend places in other cities or areas.
IMPORTANT: If the request ("${userInput}") or the location ("${location}") is pure gibberish, nonsensical, violates policies, or is impossible to fulfill, YOU MUST RETURN THIS EXACT JSON (do not return an array):
{ "error": "Sorry, I can't find any suggestions for this request or location. Please enter it more clearly!" }

Otherwise, provide a friendly intro message and the recommendations in a structured JSON object. The object MUST have the following structure:
{
  "introMessage": "A friendly, conversational introductory message based on the user's request (e.g., 'Here are some great spots I found for your trip to Hanoi!')",
  "recommendations": [
    // Array of objects with the following fields:
- type: "RESTAURANT" or "CAFE" or "ACTIVITY" or "HOTEL"
- title: Name of the place
- content: Description of the place
- address: A realistic address (fake or real but believable)
- priceRange: Estimated price (e.g. 100k - 200k VND)
- rating: Random rating between 3.5 and 5.0
- aiReason: A detailed explanation of why this place matches the request.
- imageUrl: Provide a generic placeholder image URL related to the place type (e.g., from Unsplash source or a mock URL).
- googleMapsUrl: A valid Google Maps search URL for this place (e.g., "https://www.google.com/maps/search/?api=1&query=Place+Name")
  ]
}

Return ONLY valid JSON.
`;

    type AIErrorResponse = { error: string };
    type AIRecommendationResponse = {
      introMessage: string;
      recommendations: Array<{
        type: string;
        title: string;
        content: string;
        address: string;
        priceRange: string;
        rating: number;
        aiReason: string;
        imageUrl: string;
        googleMapsUrl: string;
      }>;
    };
    type AIResponse = AIErrorResponse | AIRecommendationResponse;

    let rawResponse: AIResponse;

    try {
      rawResponse = await this.geminiService.generateJsonContent<AIResponse>(prompt);
    } catch (e) {
      this.logger.error('Failed to parse AI places recommendations', e);
      throw new Error('AI returned invalid JSON');
    }

    if (!Array.isArray(rawResponse) && 'error' in rawResponse) {
      throw new BadRequestException(rawResponse.error);
    }

    if (!('recommendations' in rawResponse) || !Array.isArray(rawResponse.recommendations)) {
      throw new BadRequestException('AI returned data that is not in the expected format.');
    }

    const { introMessage, recommendations } = rawResponse;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const created = await Promise.all(
      recommendations.map((r) =>
        this.prisma.recommendation.create({
          data: {
            groupId,
            createdBy,
            type: (() => {
              const parsedType =
                RecommendationType[r.type.toUpperCase() as keyof typeof RecommendationType];
              if (!parsedType) {
                this.logger.error(`Invalid recommendation type returned from AI: ${r.type}`);
                throw new Error(`Invalid recommendation type: ${r.type}`);
              }
              return parsedType;
            })(),
            title: r.title,
            content: {
              description: r.content,
              address: r.address,
              priceRange: r.priceRange,
              rating: r.rating,
              aiReason: r.aiReason,
              imageUrl: r.imageUrl,
              googleMapsUrl: r.googleMapsUrl,
            },
            metadata: { batchId, topic: userInput, location },
            expiresAt,
          },
        }),
      ),
    );

    return { introMessage, recommendations: created };
  }
}
