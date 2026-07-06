import { Injectable } from '@nestjs/common';
import { Currency, ExpenseSplitType, Prisma } from '@prisma/client';
import { buildPaginationMeta, buildPrismaSkipTake } from '../../../shared/common/pagination';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.expense.findUnique({
      where: { id, deletedAt: null },
      include: {
        payers: {
          where: { user: { deletedAt: null } },
          include: { user: { include: { profile: true } } },
        },
        splits: {
          where: { user: { deletedAt: null } },
          include: { user: { include: { profile: true } } },
        },
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
      ...(filters?.payerId ? { payers: { some: { userId: filters.payerId } } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          payers: {
            where: { user: { deletedAt: null } },
            include: { user: { include: { profile: true } } },
          },
          splits: {
            where: { user: { deletedAt: null } },
            include: { user: { include: { profile: true } } },
          },
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
      createdBy: string;
      title: string;
      description?: string;
      amount: number;
      currency: string;
      splitType: ExpenseSplitType;
      categoryId: string;
      date?: Date;
    },
    splits: { userId: string; amount: number; percentage?: number; shares?: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      let categoryId = data.categoryId;
      if (!categoryId) {
        const defaultCategory = await tx.category.findFirst({ where: { isDefault: true } });
        if (defaultCategory) categoryId = defaultCategory.id;
        else throw new Error('No default category found');
      }

      const expense = await tx.expense.create({
        data: {
          groupId: data.groupId,
          createdBy: data.createdBy,
          title: data.title,
          description: data.description,
          amount: data.amount,
          currency: data.currency as Currency,
          splitType: data.splitType,
          categoryId: categoryId,
          date: data.date ?? new Date(),
        },
      });

      await tx.expensePayer.create({
        data: {
          expenseId: expense.id,
          userId: data.createdBy,
          amount: data.amount,
        },
      });

      await tx.expenseSplit.createMany({
        data: splits.map((s) => ({
          expenseId: expense.id,
          userId: s.userId,
          amount: s.amount,
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
        up."display_name" as "displayName",
        COALESCE(paid.total, 0) - COALESCE(owed.total, 0) as balance
      FROM users u
      LEFT JOIN user_profiles up ON up."user_id" = u.id
      JOIN group_members gm ON gm."user_id" = u.id AND gm."group_id" = ${groupId}::uuid
      LEFT JOIN (
        SELECT ep."user_id" as "payerId", SUM(ep.amount) as total
        FROM expense_payers ep
        JOIN expenses e ON e.id = ep."expense_id"
        WHERE e."group_id" = ${groupId}::uuid AND e."deleted_at" IS NULL
        GROUP BY ep."user_id"
      ) paid ON paid."payerId" = u.id
      LEFT JOIN (
        SELECT es."user_id" as "userId", SUM(es.amount) as total
        FROM expense_splits es
        JOIN expenses e ON e.id = es."expense_id"
        WHERE e."group_id" = ${groupId}::uuid AND e."deleted_at" IS NULL
        GROUP BY es."user_id"
      ) owed ON owed."userId" = u.id
    `;
  }
}
