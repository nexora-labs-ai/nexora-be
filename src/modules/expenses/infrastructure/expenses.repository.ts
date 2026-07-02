import { Injectable } from '@nestjs/common';
import { Currency, ExpenseSplitType, FundingSource, Prisma } from '@prisma/client';
import { BusinessRuleError } from '../../../shared/common/domain-errors';
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
      fundingSource: FundingSource;
      categoryId: string;
      date?: Date;
    },
    splits: { userId: string; amount: number; shares?: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      let categoryId = data.categoryId;
      if (!categoryId) {
        const defaultCategory = await tx.category.findFirst({ where: { isDefault: true } });
        if (defaultCategory) categoryId = defaultCategory.id;
        else throw new Error('No default category found');
      }

      // 1. Group fund balance check will be done atomically during deduction

      // 2. Create Expense
      const expense = await tx.expense.create({
        data: {
          groupId: data.groupId,
          createdBy: data.createdBy,
          title: data.title,
          description: data.description,
          amount: data.amount,
          currency: data.currency as Currency,
          splitType: data.splitType,
          categoryId: data.categoryId,
          fundingSource: data.fundingSource,
          date: data.date ?? new Date(),
        },
      });

      // 3. Handle Funding Source Specifics
      if (data.fundingSource === FundingSource.PERSONAL) {
        await tx.expensePayer.create({
          data: {
            expenseId: expense.id,
            userId: data.createdBy,
            amount: data.amount,
          },
        });
      } else if (data.fundingSource === FundingSource.GROUP_FUND) {
        // Deduct from fund atomically
        const res = await tx.groupFund.updateMany({
          where: { groupId: data.groupId, balance: { gte: data.amount } },
          data: { balance: { decrement: data.amount } },
        });

        if (res.count === 0) {
          throw new BusinessRuleError('Insufficient group fund balance');
        }

        const updatedFund = await tx.groupFund.findUniqueOrThrow({
          where: { groupId: data.groupId },
        });

        // Record transaction
        await tx.fundTransaction.create({
          data: {
            fundId: updatedFund.id,
            createdBy: data.createdBy,
            expenseId: expense.id,
            type: 'EXPENSE',
            amount: data.amount,
            note: `Expense: ${data.title}`,
          },
        });
      }

      // 4. Create Splits
      await tx.expenseSplit.createMany({
        data: splits.map((s) => ({
          expenseId: expense.id,
          userId: s.userId,
          amount: s.amount,
          shares: s.shares,
        })),
      });

      return tx.expense.findFirstOrThrow({
        where: { id: expense.id },
        include: {
          payers: { include: { user: { include: { profile: true } } } },
          splits: { include: { user: { include: { profile: true } } } },
          category: true,
        },
      });
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description?: string;
      amount: number;
      currency: string;
      splitType: ExpenseSplitType;
      fundingSource?: FundingSource;
      categoryId?: string;
      date?: Date;
    }>,
    splits?: { userId: string; amount: number; shares?: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const oldExpense = await tx.expense.findFirstOrThrow({
        where: { id },
        include: { payers: true },
      });

      const newAmount = data.amount ?? Number(oldExpense.amount);
      const newFundingSource = data.fundingSource ?? oldExpense.fundingSource;

      // Handle Group Fund changes
      if (oldExpense.fundingSource === FundingSource.GROUP_FUND) {
        // Refund old amount
        await tx.groupFund.updateMany({
          where: { groupId: oldExpense.groupId },
          data: { balance: { increment: Number(oldExpense.amount) } },
        });
        await tx.fundTransaction.deleteMany({
          where: { expenseId: id },
        });
      }

      if (newFundingSource === FundingSource.GROUP_FUND) {
        // Deduct new amount atomically
        const res = await tx.groupFund.updateMany({
          where: { groupId: oldExpense.groupId as string, balance: { gte: newAmount } },
          data: { balance: { decrement: newAmount } },
        });

        if (res.count === 0) {
          throw new BusinessRuleError('Insufficient group fund balance for update');
        }

        const fund = await tx.groupFund.findUniqueOrThrow({
          where: { groupId: oldExpense.groupId as string },
        });
        await tx.fundTransaction.create({
          data: {
            fundId: fund.id,
            createdBy: oldExpense.createdBy,
            expenseId: id,
            type: 'EXPENSE',
            amount: newAmount,
            note: `Expense Updated: ${data.title ?? oldExpense.title}`,
          },
        });
      }

      const expense = await tx.expense.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          amount: data.amount,
          currency: data.currency as Currency | undefined,
          splitType: data.splitType,
          fundingSource: data.fundingSource,
          categoryId: data.categoryId,
          date: data.date,
        },
        include: { payers: true },
      });

      if (newFundingSource === FundingSource.PERSONAL) {
        if (oldExpense.payers.length > 0) {
          await tx.expensePayer.updateMany({
            where: { expenseId: id, userId: oldExpense.payers[0]!.userId },
            data: { amount: newAmount },
          });
        } else {
          // It was GROUP_FUND before, now PERSONAL, need to create payer
          await tx.expensePayer.create({
            data: { expenseId: id, userId: oldExpense.createdBy, amount: newAmount },
          });
        }
      } else if (newFundingSource === FundingSource.GROUP_FUND) {
        // Remove old payers if it changed from PERSONAL to GROUP_FUND
        await tx.expensePayer.deleteMany({ where: { expenseId: id } });
      }

      if (splits) {
        await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
        await tx.expenseSplit.createMany({
          data: splits.map((s) => ({
            expenseId: id,
            userId: s.userId,
            amount: s.amount,
            shares: s.shares,
          })),
        });
      }

      return tx.expense.findFirstOrThrow({
        where: { id },
        include: {
          payers: { include: { user: { include: { profile: true } } } },
          splits: { include: { user: { include: { profile: true } } } },
          category: true,
        },
      });
    });
  }

  async softDelete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirstOrThrow({
        where: { id },
      });

      if (expense.fundingSource === FundingSource.GROUP_FUND) {
        // Refund the amount to GroupFund
        await tx.groupFund.updateMany({
          where: { groupId: expense.groupId },
          data: { balance: { increment: Number(expense.amount) } },
        });

        // Delete the associated FundTransaction
        await tx.fundTransaction.deleteMany({
          where: { expenseId: id },
        });
      }

      return tx.expense.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async getGroupBalance(groupId: string) {
    return this.prisma.$queryRaw<{ userId: string; displayName: string; balance: number }[]>`
      SELECT
        u.id as "userId",
        up."display_name" as "displayName",
        COALESCE(paid.total, 0) - COALESCE(owed.total, 0) + COALESCE(settlements_paid.total, 0) - COALESCE(settlements_received.total, 0) as balance
      FROM users u
      LEFT JOIN user_profiles up ON up."user_id" = u.id
      JOIN group_members gm ON gm."user_id" = u.id AND gm."group_id" = ${groupId}::uuid
      LEFT JOIN (
        SELECT ep."user_id" as "payerId", SUM(ep.amount) as total
        FROM expense_payers ep
        JOIN expenses e ON e.id = ep."expense_id"
        WHERE e."group_id" = ${groupId}::uuid AND e."deleted_at" IS NULL AND e."funding_source" = 'PERSONAL'
        GROUP BY ep."user_id"
      ) paid ON paid."payerId" = u.id
      LEFT JOIN (
        SELECT es."user_id" as "userId", SUM(es.amount) as total
        FROM expense_splits es
        JOIN expenses e ON e.id = es."expense_id"
        WHERE e."group_id" = ${groupId}::uuid AND e."deleted_at" IS NULL AND e."funding_source" = 'PERSONAL'
        GROUP BY es."user_id"
      ) owed ON owed."userId" = u.id
      LEFT JOIN (
        SELECT "from_user_id", SUM(amount) as total
        FROM settlements
        WHERE "group_id" = ${groupId}::uuid AND status = 'COMPLETED'
        GROUP BY "from_user_id"
      ) settlements_paid ON settlements_paid."from_user_id" = u.id
      LEFT JOIN (
        SELECT "to_user_id", SUM(amount) as total
        FROM settlements
        WHERE "group_id" = ${groupId}::uuid AND status = 'COMPLETED'
        GROUP BY "to_user_id"
      ) settlements_received ON settlements_received."to_user_id" = u.id
    `;
  }

  async findCategories() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }
}
