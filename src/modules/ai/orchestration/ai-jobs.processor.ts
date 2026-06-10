import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUES, JOB_NAMES } from '../../../shared/queue/queue.constants';
import { RecommendationAiService } from '../recommendation/recommendation.service';
import { PlanningService } from '../planning/planning.service';

@Processor(QUEUES.AI_JOBS)
export class AiJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(AiJobsProcessor.name);

  constructor(
    private readonly recommendationAiService: RecommendationAiService,
    private readonly planningService: PlanningService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing job: ${job.name} [${job.id}]`);

    switch (job.name) {
      case JOB_NAMES.GENERATE_RECOMMENDATION:
        await this.recommendationAiService.generateExpenseRecommendations(
          job.data.groupId,
        );
        break;

      case JOB_NAMES.BUDGET_ANALYSIS:
        await this.recommendationAiService.generateBudgetAnalysis(job.data.groupId);
        break;

      case JOB_NAMES.GENERATE_ITINERARY:
        await this.planningService.generateItinerary(job.data);
        break;

      default:
        this.logger.warn(`Unknown AI job: ${job.name}`);
    }
  }
}
