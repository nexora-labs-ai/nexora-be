import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { ExpenseSplitType, Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
  buildPrismaSkipTake,
} from '../../../shared/common/pagination';

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.expense.findUnique({
      where: { id, deletedAt: null },
      include: {
        payer: true,
        splits: { include: { user: true } },
        category: true,
      },
    });
  }

  async findGroupExpenses(
    groupId: string,
    page: number,
    limit: number,
    filters?: { categoryId?: string; payerId?: string },
  ) {
    const where: Prisma.ExpenseWhereInput = {
      groupId,
      deletedAt: null,
      ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters?.payerId ? { payerId: filters.payerId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          payer: { select: { id: true, displayName: true, avatarUrl: true } },
          splits: { include: { user: { select: { id: true, displayName: true } } } },
          category: true,
        },
        orderBy: { date: 'desc' },
        ...buildPrismaSkipTake(page, limit),
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async create(
    data: {
      groupId: string;
      payerId: string;
      title: string;
      description?: string;
      amount: number;
      currency: string;
      splitType: ExpenseSplitType;
      categoryId?: string;
      date?: Date;
    },
    splits: { userId: string; amount: number; percentage?: number; shares?: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          groupId: data.groupId,
          payerId: data.payerId,
          title: data.title,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          splitType: data.splitType,
          categoryId: data.categoryId,
          date: data.date ?? new Date(),
        },
      });

      await tx.expenseSplit.createMany({
        data: splits.map((s) => ({
          expenseId: expense.id,
          userId: s.userId,
          amount: s.amount,
          percentage: s.percentage,
          shares: s.shares,
        })),
      });

      return expense;
    });
  }

  async softDelete(id: string) {
    return this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getGroupBalance(groupId: string) {
    return this.prisma.$queryRaw<{ userId: string; balance: number }[]>`
      SELECT
        u.id as "userId",
        u."displayName",
        COALESCE(paid.total, 0) - COALESCE(owed.total, 0) as balance
      FROM users u
      JOIN group_members gm ON gm."userId" = u.id AND gm."groupId" = ${groupId}
      LEFT JOIN (
        SELECT "payerId", SUM(amount) as total
        FROM expenses
        WHERE "groupId" = ${groupId} AND "deletedAt" IS NULL
        GROUP BY "payerId"
      ) paid ON paid."payerId" = u.id
      LEFT JOIN (
        SELECT "userId", SUM(amount) as total
        FROM expense_splits es
        JOIN expenses e ON e.id = es."expenseId"
        WHERE e."groupId" = ${groupId} AND e."deletedAt" IS NULL
        GROUP BY es."userId"
      ) owed ON owed."userId" = u.id
    `;
  }
}
