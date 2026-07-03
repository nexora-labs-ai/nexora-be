import { PrismaModule } from '@/shared/database/prisma.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GroupChatController } from './group-chat.controller';
import { GroupChatGateway } from './group-chat.gateway';
import { GroupChatService } from './group-chat.service';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [GroupChatController],
  providers: [GroupChatService, GroupChatGateway],
  exports: [GroupChatService],
})
export class GroupChatModule {}
