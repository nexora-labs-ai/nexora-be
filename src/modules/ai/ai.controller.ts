import {
  Controller,
  Post,
  Delete,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatService } from './chat/chat.service';
import { MemoryService } from './memory/memory.service';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';

class ChatDto {
  @ApiProperty() @IsString() message: string;
  @ApiPropertyOptional() @IsOptional() stream?: boolean;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(
    private readonly chatService: ChatService,
    private readonly memoryService: MemoryService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with Nexora AI' })
  chat(
    @CurrentUser('id') userId: string,
    @Body() dto: ChatDto,
    @Query('groupId') groupId?: string,
  ) {
    return this.chatService.chat({
      userId,
      groupId,
      message: dto.message,
      stream: dto.stream,
    });
  }

  @Delete('chat/history')
  @ApiOperation({ summary: 'Clear chat history' })
  clearHistory(
    @CurrentUser('id') userId: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.memoryService.clearHistory(userId, groupId);
  }
}
