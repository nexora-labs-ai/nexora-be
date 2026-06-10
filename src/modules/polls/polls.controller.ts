import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';

class VoteDto {
  @ApiProperty()
  @IsUUID()
  optionId: string;
}

@ApiTags('polls')
@ApiBearerAuth()
@Controller({ path: 'polls', version: '1' })
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Get()
  @ApiOperation({ summary: 'Get group polls' })
  findAll(@Query('groupId', ParseUUIDPipe) groupId: string) {
    return this.pollsService.getGroupPolls(groupId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a poll' })
  create(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreatePollDto,
  ) {
    return this.pollsService.createPoll(groupId, dto);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote on a poll' })
  vote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoteDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.pollsService.vote(id, dto.optionId, userId);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close a poll' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.closePoll(id);
  }
}
