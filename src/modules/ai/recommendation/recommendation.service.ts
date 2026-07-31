import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Recommendation, RecommendationType } from '@prisma/client';
import { z } from 'zod';
import { GoogleMapsUrlSchema, HttpsUrlSchema } from '../../../shared/common/validators/url.schemas';
import { PrismaService } from '../../../shared/database/prisma.service';
import { GeminiService } from '../providers/gemini.service';

const ExpenseRecommendationSchema = z.object({
  type: z.nativeEnum(RecommendationType),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
  priority: z.enum(['high', 'medium', 'low']),
});

const ExpenseRecommendationsArraySchema = z.array(ExpenseRecommendationSchema).min(3).max(5);

const BudgetAnalysisDataSchema = z
  .object({
    summary: z.string().trim().min(1),
    trends: z.string().trim().min(1),
    topCategories: z.array(z.string().trim().min(1)).min(1),
    savingOpportunities: z.string().trim().min(1),
    projectedMonthlySpend: z.number().finite().nonnegative(),
  })
  .strict();

const BudgetAnalysisSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('success'),
      data: BudgetAnalysisDataSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal('error'),
      message: z.string().trim().min(1),
    })
    .strict(),
]);
export type BudgetAnalysisResponse = z.infer<typeof BudgetAnalysisSchema>;

const AiRecommendationItemSchema = z.object({
  type: z.nativeEnum(RecommendationType),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
  address: z.string().trim().min(1).max(500),
  priceRange: z.string().trim().min(1).max(100),
  rating: z.coerce.number().min(0).max(5),
  aiReason: z.string().trim().min(1).max(2000),
  imageUrl: HttpsUrlSchema,
  googleMapsUrl: GoogleMapsUrlSchema,
});

const AiRecommendationResponseSchema = z.object({
  introMessage: z.string().trim().min(1).max(1000),
  recommendations: z.array(AiRecommendationItemSchema).min(1).max(5),
});

const AiRecommendationErrorSchema = z.object({
  error: z.string().trim().min(1).max(1000),
});

const AiRecommendationEnvelopeSchema = z.union([
  AiRecommendationErrorSchema,
  AiRecommendationResponseSchema,
]);

export type AiPlacesRecommendationResponse = {
  introMessage: string;
  recommendations: Recommendation[];
};

@Injectable()
export class RecommendationAiService {
  private readonly logger = new Logger(RecommendationAiService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async generateExpenseRecommendations(groupId: string): Promise<void> {
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

Provide recommendations in JSON format as an array of objects:
[
  {
    "type": "RESTAURANT" | "CAFE" | "HOTEL" | "ACTIVITY" | "ITINERARY",
    "title": "Short title",
    "content": "Detailed recommendation",
    "priority": "high" | "medium" | "low"
  }
]

Return only valid JSON.`;

    let recommendations: z.infer<typeof ExpenseRecommendationsArraySchema>;
    try {
      const raw = await this.geminiService.generateJsonContent(prompt);
      const parsed = ExpenseRecommendationsArraySchema.safeParse(raw);
      if (!parsed.success) {
        throw new SyntaxError('Invalid AI expense recommendation format');
      }
      recommendations = parsed.data;
    } catch (e) {
      this.logger.error('Failed to parse AI recommendations', e);
      return;
    }

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
        type: r.type,
        title: r.title,
        content: { body: r.content, priority: r.priority },
        expiresAt,
      })),
    });
  }

  async generateBudgetAnalysis(groupId: string): Promise<BudgetAnalysisResponse> {
    const expenses = await this.prisma.expense.findMany({
      where: { groupId, deletedAt: null },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 100,
    });

    if (expenses.length === 0) {
      return { status: 'error', message: 'Not enough expense data' };
    }

    const prompt = `
Analyze these expenses and return a budget analysis in JSON:
${JSON.stringify(expenses.map((e) => ({ amount: e.amount, category: e.category?.name, date: e.date })))}

Return exactly one JSON object:
{
  "status": "success",
  "data": {
    "summary": "Non-empty summary",
    "trends": "Non-empty spending trends",
    "topCategories": ["At least one category"],
    "savingOpportunities": "Non-empty actionable suggestions",
    "projectedMonthlySpend": 1000
  }
}

If the data cannot be analyzed, return:
{
  "status": "error",
  "message": "Non-empty reason"
}`;

    const raw = await this.geminiService.generateJsonContent<unknown>(prompt);
    const parsed = BudgetAnalysisSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.error('Failed to parse AI budget analysis response', parsed.error);
      throw new BadGatewayException('AI returned an invalid budget analysis');
    }

    return parsed.data;
  }

  async generatePlacesRecommendations(
    groupId: string,
    userInput: string,
    location: string,
    createdBy: string,
    batchId: string,
  ): Promise<AiPlacesRecommendationResponse> {
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
- type: "RESTAURANT" | "CAFE" | "ACTIVITY" | "HOTEL" | "ITINERARY"
- title: Name of the place
- content: Description of the place
- address: A realistic address (fake or real but believable)
- priceRange: Estimated price (e.g. 100k - 200k VND)
- rating: Random rating between 3.5 and 5.0
- aiReason: A detailed explanation of why this place matches the request.
- imageUrl: Provide an HTTPS image URL related to the place type.
- googleMapsUrl: A valid Google Maps search URL for this place (e.g., "https://www.google.com/maps/search/?api=1&query=Place+Name")
  ]
}

Return ONLY valid JSON.
`;

    let parsed: z.infer<typeof AiRecommendationEnvelopeSchema>;

    try {
      const raw = await this.geminiService.generateJsonContent(prompt);
      const parseResult = AiRecommendationEnvelopeSchema.safeParse(raw);
      if (!parseResult.success) {
        throw new SyntaxError('Invalid format');
      }
      parsed = parseResult.data;
    } catch (e) {
      this.logger.error('Failed to parse AI places recommendations', e);
      throw new BadGatewayException('AI returned invalid data format');
    }

    if ('error' in parsed) {
      throw new BadRequestException(parsed.error);
    }

    const { introMessage, recommendations } = parsed;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const created = await this.prisma.$transaction(
      recommendations.map((recommendation) =>
        this.prisma.recommendation.create({
          data: {
            groupId,
            createdBy,
            type: recommendation.type,
            title: recommendation.title,
            content: {
              description: recommendation.content,
              address: recommendation.address,
              priceRange: recommendation.priceRange,
              rating: recommendation.rating,
              aiReason: recommendation.aiReason,
              imageUrl: recommendation.imageUrl,
              googleMapsUrl: recommendation.googleMapsUrl,
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
