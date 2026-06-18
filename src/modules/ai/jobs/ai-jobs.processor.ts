import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUES } from '../../../shared/queue/queue.constants';
import { PlanningService } from '../planning/planning.service';
import { RecommendationAiService } from '../recommendation/recommendation.service';

@Processor(QUEUES.AI_JOBS)
export class AiJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(AiJobsProcessor.name);

  constructor(
    private readonly recommendationService: RecommendationAiService,
    private readonly planningService: PlanningService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing AI job: ${job.name}`);

    switch (job.name) {
      case JOB_NAMES.GENERATE_RECOMMENDATION:
        await this.recommendationService.generateExpenseRecommendations(job.data.groupId);
        break;

      case JOB_NAMES.BUDGET_ANALYSIS:
        await this.recommendationService.generateBudgetAnalysis(job.data.groupId);
        break;

      case JOB_NAMES.GENERATE_ITINERARY:
        await this.planningService.generateItinerary(job.data);
        break;

      default:
        this.logger.warn(`Unknown AI job: ${job.name}`);
    }
  }
}
