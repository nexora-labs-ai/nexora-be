import { Module } from '@nestjs/common';
import { PlanningService } from './planning/planning.service';
import { GeminiService } from './providers/gemini.service';
import { RecommendationAiService } from './recommendation/recommendation.service';

@Module({
  imports: [],
  controllers: [],
  providers: [RecommendationAiService, PlanningService, GeminiService],
  exports: [PlanningService, GeminiService, RecommendationAiService],
})
export class AiModule {}
