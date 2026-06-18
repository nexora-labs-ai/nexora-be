import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../shared/database/prisma.service';
import { JOB_NAMES, QUEUES } from '../../shared/queue/queue.constants';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.AI_JOBS) private readonly aiQueue: Queue,
  ) {}

  async getGroupRecommendations(groupId: string) {
    return this.prisma.recommendation.findMany({
      where: { groupId, expiresAt: { gte: new Date() } },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async triggerRecommendationGeneration(groupId: string, type: string) {
    await this.aiQueue.add(JOB_NAMES.GENERATE_RECOMMENDATION, {
      groupId,
      type,
    });
    return { message: 'Recommendation generation queued' };
  }

  async triggerBudgetAnalysis(groupId: string) {
    await this.aiQueue.add(JOB_NAMES.BUDGET_ANALYSIS, { groupId });
    return { message: 'Budget analysis queued' };
  }

  async markActedOn(id: string) {
    return this.prisma.recommendation.delete({
      where: { id },
    });
  }
}
