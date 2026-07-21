import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

import { AiModule } from '../ai/ai.module';
import { GroupChatModule } from '../group-chat/group-chat.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [AiModule, GroupChatModule, GroupsModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
