import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Recommendation, RecommendationType } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../../../shared/database/prisma.service';
import { GeminiService } from '../providers/gemini.service';

const ExpenseRecommendationSchema = z.object({
  type: z.nativeEnum(RecommendationType),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
  priority: z.enum(['high', 'medium', 'low']),
});

const ExpenseRecommendationsArraySchema = z.array(ExpenseRecommendationSchema).min(3).max(5);

const BudgetAnalysisSuccessSchema = z.object({
  summary: z.string().min(1),
  trends: z.string().min(1),
  topCategories: z.array(z.string()),
  savingOpportunities: z.string().min(1),
  projectedMonthlySpend: z.coerce.number().nonnegative(),
});

const BudgetAnalysisErrorSchema = z.object({
  error: z.string().min(1),
});

const BudgetAnalysisSchema = z.union([BudgetAnalysisSuccessSchema, BudgetAnalysisErrorSchema]);
export type BudgetAnalysisResponse = z.infer<typeof BudgetAnalysisSchema>;

const HttpUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  }, 'URL must use HTTP or HTTPS');

const ALLOWED_MAP_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
]);

const GoogleMapsUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    return ALLOWED_MAP_HOSTS.has(hostname) || hostname.endsWith('.google.com');
  }, 'Invalid Google Maps URL');

const AiRecommendationItemSchema = z.object({
  type: z.nativeEnum(RecommendationType),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
  address: z.string().trim().min(1).max(500),
  priceRange: z.string().trim().min(1).max(100),
  rating: z.coerce.number().min(0).max(5),
  aiReason: z.string().trim().min(1).max(2000),
  imageUrl: HttpUrlSchema,
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

    const prompt = `
Analyze these expenses and return a budget analysis in JSON:
${JSON.stringify(expenses.map((e) => ({ amount: e.amount, category: e.category?.name, date: e.date })))}

Return JSON with: { summary, trends, topCategories, savingOpportunities, projectedMonthlySpend }`;

    try {
      const raw = await this.geminiService.generateJsonContent(prompt);
      const parsed = BudgetAnalysisSchema.safeParse(raw);
      if (!parsed.success) {
        throw new SyntaxError('Invalid AI budget analysis format');
      }
      return parsed.data;
    } catch (e) {
      this.logger.error('Analysis failed', e);
      return { error: 'Analysis failed' };
    }
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
- imageUrl: Provide a generic placeholder image URL related to the place type (e.g., from Unsplash source or a mock URL).
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
