import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroupRole } from '@prisma/client';
import { GroupsRepository } from '../infrastructure/groups.repository';
import { Group } from '../domain/group.entity';
import { GROUP_EVENTS, GroupCreatedEvent, MemberAddedEvent } from '../domain/group.events';
import { CacheService } from '../../../shared/infrastructure/cache/cache.service';
import { NotFoundError } from '../../../shared/common/domain-errors';
import { CreateGroupDto } from '../presentation/create-group.dto';
import { UpdateGroupDto } from '../presentation/update-group.dto';
import { AddMemberDto } from '../presentation/add-member.dto';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly groupsRepository: GroupsRepository,
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
      new GroupCreatedEvent(group.id, createdBy, group.name),
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

  private toDomain(data: {
    id: string;
    name: string;
    currency: string;
    members: { userId: string; role: GroupRole }[];
  }): Group {
    return new Group(data.id, data.name, data.currency, data.members);
  }
}
