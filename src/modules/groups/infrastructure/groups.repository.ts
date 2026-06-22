import { Injectable } from '@nestjs/common';
import { Currency, GroupRole } from '@prisma/client';
import {
  PaginatedResult,
  buildPaginationMeta,
  buildPrismaSkipTake,
} from '../../../shared/common/pagination';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.group.findUnique({
      where: { id, deletedAt: null },
      include: {
        members: { include: { user: { include: { profile: true } } } },
      },
    });
  }

  async findByIdWithMembers(id: string) {
    return this.prisma.group.findUnique({
      where: { id, deletedAt: null },
      include: { members: true },
    });
  }

  async findUserGroups(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<unknown>> {
    const where = {
      deletedAt: null,
      members: { some: { userId } },
    };

    const [data, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        include: {
          members: { where: { userId } },
          _count: { select: { members: true, expenses: true } },
        },
        orderBy: { updatedAt: 'desc' },
        ...buildPrismaSkipTake(page, limit),
      }),
      this.prisma.group.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async create(data: {
    name: string;
    description?: string;
    currency: string;
    createdByUserId: string;
  }) {
    return this.prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        currency: data.currency as Currency,
        members: {
          create: {
            userId: data.createdByUserId,
            role: GroupRole.OWNER,
          },
        },
      },
      include: { members: true },
    });
  }

  async update(id: string, data: Partial<{ name: string; description: string }>) {
    return this.prisma.group.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.group.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async addMember(groupId: string, userId: string, role: GroupRole = GroupRole.MEMBER) {
    return this.prisma.groupMember.create({
      data: { groupId, userId, role },
    });
  }

  async removeMember(groupId: string, userId: string) {
    return this.prisma.groupMember.updateMany({
      where: { groupId, userId },
      data: { leftAt: new Date() },
    });
  }

  async updateMemberRole(groupId: string, userId: string, role: GroupRole) {
    return this.prisma.groupMember.updateMany({
      where: { groupId, userId },
      data: { role },
    });
  }

  // --- Invitations ---

  async createInvitation(data: {
    groupId: string;
    email: string;
    invitedBy: string;
    token: string;
  }) {
    return this.prisma.groupInvitation.create({
      data: {
        groupId: data.groupId,
        email: data.email,
        invitedBy: data.invitedBy,
        token: data.token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  async findInvitationByToken(token: string) {
    return this.prisma.groupInvitation.findUnique({
      where: { token },
      include: { group: true },
    });
  }

  async acceptInvitation(id: string) {
    return this.prisma.groupInvitation.update({
      where: { id },
      data: { acceptedAt: new Date() },
    });
  }

  async deleteInvitation(id: string) {
    return this.prisma.groupInvitation.delete({
      where: { id },
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
