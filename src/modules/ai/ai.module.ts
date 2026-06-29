import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { ChatService } from './chat/chat.service';
import { MemoryService } from './memory/memory.service';
import { GeminiService } from './planning/gemini.service';
import { PlanningService } from './planning/planning.service';
import { RecommendationAiService } from './recommendation/recommendation.service';

@Module({
  imports: [],
  controllers: [AiController],
  providers: [ChatService, MemoryService, RecommendationAiService, PlanningService, GeminiService],
  exports: [ChatService, MemoryService, PlanningService],
})
export class AiModule {}
