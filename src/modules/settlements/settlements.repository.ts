import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { SettlementStatus } from '@prisma/client';

@Injectable()
export class SettlementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.settlement.findUnique({
      where: { id },
      include: {
        fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
        toUser: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async findGroupSettlements(groupId: string) {
    return this.prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: { select: { id: true, displayName: true } },
        toUser: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency: string;
    note?: string;
  }) {
    return this.prisma.settlement.create({
      data: {
        ...data,
        status: SettlementStatus.PENDING,
      },
    });
  }

  async complete(id: string) {
    return this.prisma.settlement.update({
      where: { id },
      data: { status: SettlementStatus.COMPLETED, settledAt: new Date() },
    });
  }

  async cancel(id: string) {
    return this.prisma.settlement.update({
      where: { id },
      data: { status: SettlementStatus.CANCELLED },
    });
  }
}
