import { JwtAuthGuard } from '@/shared/common/guards/jwt-auth.guard';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GroupRole } from '@prisma/client';
import { RequireGroupRole } from '../groups/presentation/guards/group-role.decorator';
import { GroupRoleGuard } from '../groups/presentation/guards/group-role.guard';
import { GroupChatService } from './group-chat.service';

@ApiTags('Group Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GroupRoleGuard)
@RequireGroupRole(GroupRole.MEMBER)
@Controller('groups/:groupId/messages')
export class GroupChatController {
  constructor(private readonly groupChatService: GroupChatService) {}

  @Get()
  @ApiOperation({ summary: 'Get group messages history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'before',
    required: false,
    type: String,
    description: 'Cursor for pagination (message ID)',
  })
  async getMessages(
    @Param('groupId') groupId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    const messages = await this.groupChatService.getGroupMessages(
      groupId,
      limit ? Number.parseInt(limit.toString()) : 50,
      before,
    );
    return { data: messages };
  }
}
