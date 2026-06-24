import * as crypto from 'node:crypto';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroupRole } from '@prisma/client';
import { NotFoundError } from '../../../shared/common/domain-errors';
import { CacheService } from '../../../shared/infrastructure/cache/cache.service';
import { UsersService } from '../../users/users.service';
import { Group } from '../domain/group.entity';
import {
  GROUP_EVENTS,
  GroupCreatedEvent,
  GroupInvitationRespondedEvent,
  GroupInvitedEvent,
  MemberAddedEvent,
} from '../domain/group.events';
import { GroupsRepository } from '../infrastructure/groups.repository';
import { AddMemberDto } from '../presentation/add-member.dto';
import { CreateGroupDto } from '../presentation/create-group.dto';
import { InviteMemberDto } from '../presentation/invite-member.dto';
import { UpdateGroupDto } from '../presentation/update-group.dto';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly usersService: UsersService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getGroup(groupId: string, requestingUserId: string) {
    const data = await this.groupsRepository.findById(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertMember(requestingUserId);

    return data;
  }

  async getUserGroups(userId: string, page: number, limit: number) {
    return this.groupsRepository.findUserGroups(userId, page, limit);
  }

  async createGroup(dto: CreateGroupDto, createdBy: string) {
    const group = await this.groupsRepository.create({
      name: dto.name,
      description: dto.description,
      currency: dto.currency ?? 'USD',
      createdByUserId: createdBy,
    });

    this.eventEmitter.emit(
      GROUP_EVENTS.CREATED,
      new GroupCreatedEvent(group.id, createdBy, group.name ?? ''),
    );

    await this.cacheService.del(CacheService.keys.group(group.id));
    return group;
  }

  async updateGroup(groupId: string, dto: UpdateGroupDto, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertAdmin(requestingUserId);

    const updated = await this.groupsRepository.update(groupId, dto);
    await this.cacheService.del(CacheService.keys.group(groupId));
    return updated;
  }

  async deleteGroup(groupId: string, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertOwner(requestingUserId);

    await this.groupsRepository.softDelete(groupId);
    await this.cacheService.del(CacheService.keys.group(groupId));
  }

  async addMember(groupId: string, dto: AddMemberDto, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertAdmin(requestingUserId);
    group.assertCanAddMember();

    const member = await this.groupsRepository.addMember(groupId, dto.userId);

    this.eventEmitter.emit(
      GROUP_EVENTS.MEMBER_ADDED,
      new MemberAddedEvent(groupId, dto.userId, requestingUserId),
    );

    await this.cacheService.del(CacheService.keys.groupMembers(groupId));
    return member;
  }

  async removeMember(groupId: string, targetUserId: string, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);

    // Can remove self or admin can remove others
    if (targetUserId !== requestingUserId) {
      group.assertAdmin(requestingUserId);
    }

    await this.groupsRepository.removeMember(groupId, targetUserId);
    await this.cacheService.del(CacheService.keys.groupMembers(groupId));
  }

  async inviteMember(groupId: string, dto: InviteMemberDto, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertMember(requestingUserId); // Owner or member can invite

    const userToInvite = await this.usersService.findByEmail(dto.email);
    if (!userToInvite) {
      throw new Error('User not found with this email'); // Could use a custom DomainError
    }

    if (group.members.some((m) => m.userId === userToInvite.id)) {
      throw new Error('User is already a member of this group');
    }

    const inviter = await this.usersService.findById(requestingUserId);
    const inviterEmail = inviter?.profile?.displayName ?? inviter?.email ?? 'someone';

    const token = crypto.randomBytes(32).toString('hex');

    await this.groupsRepository.createInvitation({
      groupId,
      email: dto.email,
      invitedBy: requestingUserId,
      token,
    });

    // Notify user
    this.eventEmitter.emit(
      GROUP_EVENTS.INVITED,
      new GroupInvitedEvent(
        groupId,
        userToInvite.id,
        requestingUserId,
        token,
        group.name,
        inviterEmail,
      ),
    );

    return { message: 'Invitation sent successfully' };
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.groupsRepository.findInvitationByToken(token);
    if (!invitation) throw new NotFoundError('Invitation', token);

    if (invitation.acceptedAt) throw new Error('Invitation already accepted');
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new Error('Invitation expired');
    }

    const userToInvite = await this.usersService.findByEmail(invitation.email!);
    if (!userToInvite || userToInvite.id !== userId) {
      throw new Error('You are not authorized to accept this invitation');
    }

    // Add member
    await this.groupsRepository.addMember(invitation.groupId!, userId);
    await this.groupsRepository.acceptInvitation(invitation.id);

    // Clear cache
    await this.cacheService.del(CacheService.keys.groupMembers(invitation.groupId!));

    this.eventEmitter.emit(
      GROUP_EVENTS.INVITATION_RESPONDED,
      new GroupInvitationRespondedEvent(token, 'ACCEPTED', userId),
    );
  }

  async rejectInvitation(token: string, userId: string) {
    const invitation = await this.groupsRepository.findInvitationByToken(token);
    if (!invitation) throw new NotFoundError('Invitation', token);

    const userToInvite = await this.usersService.findByEmail(invitation.email!);
    if (!userToInvite || userToInvite.id !== userId) {
      throw new ForbiddenException('You are not authorized to reject this invitation');
    }

    await this.groupsRepository.deleteInvitation(invitation.id);

    this.eventEmitter.emit(
      GROUP_EVENTS.INVITATION_RESPONDED,
      new GroupInvitationRespondedEvent(token, 'REJECTED', userId),
    );
  }

  private toDomain(data: {
    id: string;
    name: string | null;
    currency: string | null;
    members: { userId: string | null; role: GroupRole | null }[];
  }): Group {
    return new Group(
      data.id,
      data.name ?? '',
      data.currency ?? 'USD',
      data.members
        .filter((m) => m.userId != null && m.role != null)
        .map((m) => ({ userId: m.userId as string, role: m.role as GroupRole })),
    );
  }
}
