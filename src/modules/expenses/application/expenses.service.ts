import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExpenseSplitType } from '@prisma/client';
import { ExpensesRepository } from '../infrastructure/expenses.repository';
import { GroupsService } from '../../groups/application/groups.service';
import { ExpenseSplitter } from '../domain/expense-splitter';
import { EXPENSE_EVENTS, ExpenseCreatedEvent } from '../domain/expense.events';
import { Money } from '../../../shared/common/value-objects/money';
import { CacheService } from '../../../shared/infrastructure/cache/cache.service';
import { RealtimeService } from '../../../shared/realtime/realtime.service';
import { NotFoundError, ForbiddenError } from '../../../shared/common/domain-errors';
import { CreateExpenseDto } from '../presentation/create-expense.dto';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly groupsService: GroupsService,
    private readonly cacheService: CacheService,
    private readonly realtimeService: RealtimeService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getGroupExpenses(
    groupId: string,
    userId: string,
    page: number,
    limit: number,
    filters?: { categoryId?: string; payerId?: string },
  ) {
    // Validate membership
    await this.groupsService.getGroup(groupId, userId);

    return this.cacheService.getOrSet(
      `${CacheService.keys.groupExpenses(groupId)}:${page}:${limit}`,
      () => this.expensesRepository.findGroupExpenses(groupId, page, limit, filters),
      60, // 1 minute cache
    );
  }

  async getExpense(id: string, requestingUserId: string) {
    const expense = await this.expensesRepository.findById(id);
    if (!expense) throw new NotFoundError('Expense', id);

    // Verify membership
    await this.groupsService.getGroup(expense.groupId, requestingUserId);
    return expense;
  }

  async createExpense(dto: CreateExpenseDto, payerId: string) {
    // Verify payer is group member
    await this.groupsService.getGroup(dto.groupId, payerId);

    const total = Money.of(dto.amount, dto.currency ?? 'USD');

    // Determine splits
    let splits: { userId: string; amount: number; percentage?: number; shares?: number }[];

    if (dto.splitType === ExpenseSplitType.EQUAL && !dto.splits?.length) {
      // Auto-split equally among all members
      const group = await this.groupsService.getGroup(dto.groupId, payerId);
      const participants = (group as unknown as { members: { userId: string }[] }).members.map(
        (m) => ({ userId: m.userId }),
      );
      splits = ExpenseSplitter.split(total, participants, ExpenseSplitType.EQUAL);
    } else {
      const participants = dto.splits ?? [];
      splits = ExpenseSplitter.split(total, participants, dto.splitType);
    }

    const expense = await this.expensesRepository.create(
      {
        groupId: dto.groupId,
        payerId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        splitType: dto.splitType,
        categoryId: dto.categoryId,
        date: dto.date ? new Date(dto.date) : undefined,
      },
      splits,
    );

    // Invalidate cache
    await this.cacheService.del(CacheService.keys.groupExpenses(dto.groupId));

    // Publish domain event
    this.eventEmitter.emit(
      EXPENSE_EVENTS.CREATED,
      new ExpenseCreatedEvent(
        expense.id,
        dto.groupId,
        payerId,
        dto.amount,
        dto.currency ?? 'USD',
        splits.map((s) => s.userId),
      ),
    );

    // Realtime notification
    this.realtimeService.notifyGroupExpenseCreated(dto.groupId, expense);

    return expense;
  }

  async deleteExpense(id: string, requestingUserId: string) {
    const expense = await this.expensesRepository.findById(id);
    if (!expense) throw new NotFoundError('Expense', id);

    // Only payer can delete
    if (expense.payerId !== requestingUserId) {
      const group = await this.groupsService.getGroup(expense.groupId, requestingUserId);
      const members = (group as unknown as { members: { userId: string; role: string }[] }).members;
      const isAdmin = members.some(
        (m) => m.userId === requestingUserId && ['OWNER', 'ADMIN'].includes(m.role),
      );
      if (!isAdmin) throw new ForbiddenError('Only the payer or group admin can delete an expense');
    }

    await this.expensesRepository.softDelete(id);
    await this.cacheService.del(CacheService.keys.groupExpenses(expense.groupId));
  }

  async getGroupBalance(groupId: string, requestingUserId: string) {
    await this.groupsService.getGroup(groupId, requestingUserId);
    return this.cacheService.getOrSet(
      CacheService.keys.settlement(groupId),
      () => this.expensesRepository.getGroupBalance(groupId),
      120,
    );
  }
}
