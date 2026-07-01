import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AI_PORT, AiPort } from '../../../shared/infrastructure/ports/ai.port';

@Injectable()
export class RecommendationAiService {
  private readonly logger = new Logger(RecommendationAiService.name);

  constructor(
    @Inject(AI_PORT) private readonly aiPort: AiPort,
    private readonly prisma: PrismaService,
  ) {}

  async generateExpenseRecommendations(groupId: string): Promise<void> {
    // Fetch context data
    const [expenses, members] = await Promise.all([
      this.prisma.expense.findMany({
        where: { groupId, deletedAt: null },
        include: { category: true, splits: true },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      this.prisma.groupMember.count({ where: { groupId } }),
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

Group: ${members} members
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

    const response = await this.aiPort.complete({ userPrompt: prompt, temperature: 0.5 });

    let recommendations: Array<{ type: string; title: string; content: string; priority: string }>;
    try {
      recommendations = JSON.parse(response.content);
    } catch {
      this.logger.error('Failed to parse AI recommendations');
      return;
    }

    // Store recommendations
    const owner = await this.prisma.groupMember.findFirst({
      where: { groupId, role: 'OWNER' },
    });
    if (!owner) {
      this.logger.error('Cannot generate recommendations without a group owner');
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.recommendation.createMany({
      data: recommendations.map((r) => ({
        groupId,
        type: (r.type.toUpperCase() as any) || 'ACTIVITY',
        title: r.title,
        content: { body: r.content, priority: r.priority },
        expiresAt,
        createdBy: owner.userId,
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

    const response = await this.aiPort.complete({ userPrompt: prompt, temperature: 0.3 });

    try {
      return JSON.parse(response.content);
    } catch {
      return { error: 'Analysis failed', raw: response.content };
    }
  }
}
