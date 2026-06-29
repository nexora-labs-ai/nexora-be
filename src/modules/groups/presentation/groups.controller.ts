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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GroupRole } from '@prisma/client';
import { CurrentUser } from '../../../shared/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../shared/common/dtos/pagination-query.dto';
import { GroupsService } from '../application/groups.service';
import { AddMemberDto } from './add-member.dto';
import { ContributeFundDto } from './contribute-fund.dto';
import { CreateGroupDto } from './create-group.dto';
import { FundActionResponseDto } from './fund-response.dto';
import { RequireGroupRole } from './guards/group-role.decorator';
import { GroupRoleGuard } from './guards/group-role.guard';
import { InviteMemberDto } from './invite-member.dto';
import { UpdateGroupDto } from './update-group.dto';
import { UpdateMemberRoleDto } from './update-member-role.dto';
import { WithdrawFundDto } from './withdraw-fund.dto';

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(GroupRoleGuard)
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
  @RequireGroupRole(GroupRole.OWNER)
  @ApiOperation({ summary: 'Update group' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.updateGroup(id, dto, userId);
  }

  @Delete(':id')
  @RequireGroupRole(GroupRole.OWNER)
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
  @RequireGroupRole(GroupRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from group' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.groupsService.removeMember(id, memberId, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get group members' })
  getMembers(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.getGroupMembers(id, userId);
  }

  @Patch(':id/members/:memberId/role')
  @RequireGroupRole(GroupRole.OWNER)
  @ApiOperation({ summary: 'Update member role' })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.groupsService.updateMemberRole(id, memberId, dto.role, userId);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave group' })
  leaveGroup(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.leaveGroup(id, userId);
  }

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Invite a member to group by email' })
  inviteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.groupsService.inviteMember(id, dto, userId);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept group invitation' })
  acceptInvitation(@Param('token') token: string, @CurrentUser('id') userId: string) {
    return this.groupsService.acceptInvitation(token, userId);
  }

  @Post('invitations/:token/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject group invitation' })
  rejectInvitation(@Param('token') token: string, @CurrentUser('id') userId: string) {
    return this.groupsService.rejectInvitation(token, userId);
  }

  @Post(':id/fund/contribute')
  @ApiOperation({ summary: 'Contribute to the group fund' })
  @ApiResponse({ status: 201, type: FundActionResponseDto })
  async contributeFund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ContributeFundDto,
  ) {
    return this.groupsService.contributeFund(id, dto, userId);
  }

  @Post(':id/fund/withdraw')
  @ApiOperation({ summary: 'Withdraw/Refund from the group fund' })
  @ApiResponse({ status: 201, type: FundActionResponseDto })
  async withdrawFund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: WithdrawFundDto,
  ) {
    return this.groupsService.withdrawFund(id, dto, userId);
  }

  @Get(':id/fund/transactions')
  @ApiOperation({ summary: 'Get fund transactions history' })
  async getFundTransactions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.groupsService.getFundTransactions(id, userId);
  }
}
