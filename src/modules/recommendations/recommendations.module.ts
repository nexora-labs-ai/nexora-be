import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { QUEUES } from '../../shared/queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.AI_JOBS })],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
