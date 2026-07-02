import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { GroupsModule } from '../groups/groups.module';
import { ItineraryItemController } from './itinerary-item.controller';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';

@Module({
  imports: [AiModule, GroupsModule],
  controllers: [ItineraryController, ItineraryItemController],
  providers: [ItineraryService],
})
export class ItineraryModule {}
