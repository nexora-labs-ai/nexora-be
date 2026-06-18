import { Injectable } from '@nestjs/common';
import { Currency, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class SettlementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.settlement.findUnique({
      where: { id },
      include: {
        fromUser: { include: { profile: true } },
        toUser: { include: { profile: true } },
      },
    });
  }

  async findGroupSettlements(groupId: string) {
    return this.prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: { include: { profile: true } },
        toUser: { include: { profile: true } },
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
        groupId: data.groupId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        amount: data.amount,
        currency: data.currency as Currency,
        note: data.note,
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
