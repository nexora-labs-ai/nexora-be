import * as crypto from 'node:crypto';
import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroupRole } from '@prisma/client';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/common/domain-errors';
import { CacheService } from '../../../shared/infrastructure/cache/cache.service';
import { STORAGE_PORT, StoragePort } from '../../../shared/infrastructure/ports/storage.port';
import { UsersService } from '../../users/users.service';
import { Group } from '../domain/group.entity';
import {
  GROUP_EVENTS,
  GroupCreatedEvent,
  GroupInvitationRespondedEvent,
  GroupInvitedEvent,
  MemberAddedEvent,
  MemberRemovedEvent,
} from '../domain/group.events';
import { GroupsRepository } from '../infrastructure/groups.repository';
import { AddMemberDto } from '../presentation/add-member.dto';
import { ContributeFundDto } from '../presentation/contribute-fund.dto';
import { CreateGroupDto } from '../presentation/create-group.dto';
import { InviteMemberDto } from '../presentation/invite-member.dto';
import { UpdateGroupDto } from '../presentation/update-group.dto';
import { WithdrawFundDto } from '../presentation/withdraw-fund.dto';

export type GroupPayload = {
  id: string;
  name: string | null;
  avatarUrl?: string | null;
  currency: string | null;
  members: { userId: string | null; role: GroupRole | null }[];
};

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly usersService: UsersService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
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
    group.assertOwner(requestingUserId);

    if (dto.currency && dto.currency !== data.currency) {
      const hasTransactions = await this.groupsRepository.hasFinancialTransactions(groupId);
      if (hasTransactions) {
        throw new BusinessRuleError(
          'Cannot change group currency after financial transactions have been made',
        );
      }
    }

    const updated = await this.groupsRepository.update(groupId, {
      name: dto.name,
      description: dto.description,
      currency: dto.currency,
    });
    await this.cacheService.del(CacheService.keys.group(groupId));
    return updated;
  }

  async uploadAvatar(groupId: string, file: Express.Multer.File, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertOwner(requestingUserId);

    const key = `groups/${groupId}/avatar`;

    const uploadResponse = await this.storage.upload({
      key,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    try {
      const updated = await this.groupsRepository.update(groupId, {
        avatarUrl: uploadResponse.url,
      });

      await this.cacheService.del(CacheService.keys.group(groupId));
      return updated;
    } catch (error) {
      this.storage
        .delete(uploadResponse.key)
        .catch((e) => this.logger.error('Failed to rollback avatar', e));
      throw error;
    }
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
    group.assertOwner(requestingUserId);
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

    if (targetUserId === requestingUserId) {
      throw new BusinessRuleError(
        'You cannot remove yourself from the group. Please leave the group instead.',
      );
    }

    group.assertOwner(requestingUserId);

    if (group.isOwner(targetUserId)) {
      throw new BusinessRuleError('Cannot remove the group owner');
    }

    await this.groupsRepository.removeMember(groupId, targetUserId);

    this.eventEmitter.emit(
      GROUP_EVENTS.MEMBER_REMOVED,
      new MemberRemovedEvent(groupId, targetUserId, requestingUserId),
    );

    await this.cacheService.del(CacheService.keys.groupMembers(groupId));
  }

  async leaveGroup(groupId: string, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertMember(requestingUserId);

    if (group.isOwner(requestingUserId)) {
      const ownersCount = group.members.filter((m) => m.role === GroupRole.OWNER).length;
      if (ownersCount === 1 && group.members.length > 1) {
        throw new BusinessRuleError(
          'You are the only owner. Please promote another member to owner before leaving.',
        );
      }

      if (ownersCount === 1 && group.members.length === 1) {
        await this.groupsRepository.softDelete(groupId);
      } else {
        await this.groupsRepository.removeMember(groupId, requestingUserId);
      }
    } else {
      await this.groupsRepository.removeMember(groupId, requestingUserId);
    }

    this.eventEmitter.emit(
      GROUP_EVENTS.MEMBER_REMOVED,
      new MemberRemovedEvent(groupId, requestingUserId, requestingUserId),
    );

    await this.cacheService.del(CacheService.keys.group(groupId));
    await this.cacheService.del(CacheService.keys.groupMembers(groupId));
  }

  async getGroupMembers(groupId: string, requestingUserId: string) {
    const data = await this.groupsRepository.findById(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertMember(requestingUserId);

    return data.members.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }));
  }

  async updateMemberRole(
    groupId: string,
    targetUserId: string,
    newRole: GroupRole,
    requestingUserId: string,
  ) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);

    group.assertOwner(requestingUserId);

    if (targetUserId === requestingUserId && newRole !== GroupRole.OWNER) {
      throw new BusinessRuleError(
        'You cannot demote yourself. Ask another owner to do this, or leave the group.',
      );
    }

    if (!group.isMember(targetUserId)) {
      throw new NotFoundError('Member in group', targetUserId);
    }

    await this.groupsRepository.updateMemberRole(groupId, targetUserId, newRole);

    await this.cacheService.del(CacheService.keys.group(groupId));
    await this.cacheService.del(CacheService.keys.groupMembers(groupId));
  }

  async inviteMember(groupId: string, dto: InviteMemberDto, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertMember(requestingUserId); // Owner or member can invite

    const userToInvite = await this.usersService.findByEmail(dto.email);
    if (!userToInvite) {
      throw new NotFoundError('User', dto.email);
    }

    if (group.members.some((m) => m.userId === userToInvite.id)) {
      throw new ConflictError('User is already a member of this group');
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

    if (invitation.acceptedAt) throw new ConflictError('Invitation already accepted');
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BusinessRuleError('Invitation expired');
    }

    const userToInvite = await this.usersService.findByEmail(invitation.email!);
    if (!userToInvite || userToInvite.id !== userId) {
      throw new ForbiddenException('You are not authorized to accept this invitation');
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

  private toDomain(data: GroupPayload): Group {
    return new Group(
      data.id,
      data.name ?? '',
      data.currency ?? 'USD',
      data.members
        .filter((m) => m.userId != null && m.role != null)
        .map((m) => ({ userId: m.userId as string, role: m.role as GroupRole })),
    );
  }

  async contributeFund(groupId: string, dto: ContributeFundDto, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertMember(requestingUserId); // Must be a member to contribute

    const result = await this.groupsRepository.contributeFund(
      groupId,
      requestingUserId,
      dto.amount,
      dto.note,
    );
    await this.cacheService.del(CacheService.keys.group(groupId));
    return result;
  }

  async withdrawFund(groupId: string, dto: WithdrawFundDto, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    const member = data.members.find((m) => m.userId === requestingUserId);
    if (!member || !['OWNER'].includes(member.role)) {
      throw new ForbiddenError('Only the group owner can withdraw fund');
    }

    const result = await this.groupsRepository.withdrawFund(
      groupId,
      requestingUserId,
      dto.amount,
      dto.note,
    );
    await this.cacheService.del(CacheService.keys.group(groupId));
    return result;
  }

  async getFundTransactions(groupId: string, requestingUserId: string) {
    const data = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!data) throw new NotFoundError('Group', groupId);

    const group = this.toDomain(data);
    group.assertMember(requestingUserId); // Must be a member to view transactions

    return this.groupsRepository.findFundTransactions(groupId);
  }
}
