import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../shared/common/dtos/pagination-query.dto';
import { GroupsService } from '../application/groups.service';
import { AddMemberDto } from './add-member.dto';
import { CreateGroupDto } from './create-group.dto';
import { UpdateGroupDto } from './update-group.dto';

@ApiTags('groups')
@ApiBearerAuth()
@Controller({ path: 'groups', version: '1' })
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all groups for current user' })
  findMyGroups(@CurrentUser('id') userId: string, @Query() query: PaginationQueryDto) {
    return this.groupsService.getUserGroups(userId, query.page ?? 1, query.limit ?? 20);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.getGroup(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.updateGroup(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete group' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.deleteGroup(id, userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to group' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.groupsService.addMember(id, dto, userId);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from group' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.groupsService.removeMember(id, memberId, userId);
  }
}
