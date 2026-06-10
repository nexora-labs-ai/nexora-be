import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiController } from './ai.controller';
import { ChatService } from './chat/chat.service';
import { MemoryService } from './memory/memory.service';
import { RecommendationAiService } from './recommendation/recommendation.service';
import { PlanningService } from './planning/planning.service';
import { AiJobsProcessor } from './orchestration/ai-jobs.processor';
import { QUEUES } from '../../shared/queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.AI_JOBS })],
  controllers: [AiController],
  providers: [
    ChatService,
    MemoryService,
    RecommendationAiService,
    PlanningService,
    AiJobsProcessor,
  ],
  exports: [ChatService, MemoryService],
})
export class AiModule {}
