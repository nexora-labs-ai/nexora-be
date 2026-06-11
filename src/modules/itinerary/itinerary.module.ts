import { Module } from '@nestjs/common';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';

@Module({
  imports: [],
  controllers: [ItineraryController],
  providers: [ItineraryService],
})
export class ItineraryModule {}
