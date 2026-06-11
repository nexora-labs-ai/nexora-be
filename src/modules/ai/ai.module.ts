import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { ChatService } from './chat/chat.service';
import { MemoryService } from './memory/memory.service';
import { RecommendationAiService } from './recommendation/recommendation.service';
import { PlanningService } from './planning/planning.service';

@Module({
  imports: [],
  controllers: [AiController],
  providers: [
    ChatService,
    MemoryService,
    RecommendationAiService,
    PlanningService,
  ],
  exports: [ChatService, MemoryService],
})
export class AiModule {}
