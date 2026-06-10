import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { GroupRole } from '@prisma/client';
import {
  buildPaginationMeta,
  buildPrismaSkipTake,
  PaginatedResult,
} from '../../../shared/common/pagination';

@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.group.findUnique({
      where: { id, deletedAt: null },
      include: {
        members: { include: { user: true } },
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
        currency: data.currency,
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
}
