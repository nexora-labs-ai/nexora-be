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
        fund: true,
      },
    });
  }

  async findByIdWithMembers(id: string) {
    return this.prisma.group.findUnique({
      where: { id, deletedAt: null },
      include: { members: true, fund: true },
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
          fund: true,
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
        fund: {
          create: {
            balance: 0,
          },
        },
      },
      include: { members: true, fund: true },
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

  async contributeFund(groupId: string, userId: string, amount: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get or create GroupFund
      let fund = await tx.groupFund.findUnique({
        where: { groupId },
      });

      if (!fund) {
        fund = await tx.groupFund.create({
          data: {
            groupId,
            balance: 0,
          },
        });
      }

      // 2. Update balance
      const updatedFund = await tx.groupFund.update({
        where: { id: fund.id },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // 3. Create FundTransaction
      const transaction = await tx.fundTransaction.create({
        data: {
          fundId: fund.id,
          createdBy: userId,
          type: 'CONTRIBUTION',
          amount,
          note,
        },
      });

      return { fund: updatedFund, transaction };
    });
  }

  async withdrawFund(groupId: string, userId: string, amount: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const fund = await tx.groupFund.findUnique({
        where: { groupId },
      });

      if (!fund || Number(fund.balance) < amount) {
        throw new Error('Insufficient group fund balance for withdrawal');
      }

      const updatedFund = await tx.groupFund.update({
        where: { id: fund.id },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      const transaction = await tx.fundTransaction.create({
        data: {
          fundId: fund.id,
          createdBy: userId,
          type: 'REFUND',
          amount,
          note,
        },
      });

      return { fund: updatedFund, transaction };
    });
  }

  async findFundTransactions(groupId: string) {
    const fund = await this.prisma.groupFund.findUnique({
      where: { groupId },
      select: { id: true },
    });

    if (!fund) return [];

    return this.prisma.fundTransaction.findMany({
      where: { fundId: fund.id },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }
}
