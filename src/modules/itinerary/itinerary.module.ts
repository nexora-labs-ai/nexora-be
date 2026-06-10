import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';
import { QUEUES } from '../../shared/queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.AI_JOBS })],
  controllers: [ItineraryController],
  providers: [ItineraryService],
})
export class ItineraryModule {}
