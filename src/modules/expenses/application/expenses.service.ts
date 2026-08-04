import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExpenseSplitType, GroupRole } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../../shared/common/domain-errors';
import { Money } from '../../../shared/common/value-objects/money';
import { CacheService } from '../../../shared/infrastructure/cache/cache.service';
import { STORAGE_PORT, StoragePort } from '../../../shared/infrastructure/ports/storage.port';
import { RealtimeService } from '../../../shared/realtime/realtime.service';
import { GeminiService } from '../../ai/providers/gemini.service';
import { GroupsService } from '../../groups/application/groups.service';
import { ExpenseSplitter } from '../domain/expense-splitter';
import { EXPENSE_EVENTS, ExpenseCreatedEvent, ExpenseUpdatedEvent } from '../domain/expense.events';
import { ExpensesRepository } from '../infrastructure/expenses.repository';
import { CreateExpenseDto } from '../presentation/create-expense.dto';
import { UpdateExpenseDto } from '../presentation/update-expense.dto';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly groupsService: GroupsService,
    private readonly cacheService: CacheService,
    private readonly realtimeService: RealtimeService,
    private readonly eventEmitter: EventEmitter2,
    private readonly geminiService: GeminiService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
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

    const filterKey = `${filters?.categoryId ?? '_'}:${filters?.payerId ?? '_'}`;
    return this.cacheService.getOrSet(
      `${CacheService.keys.groupExpenses(groupId)}:${page}:${limit}:${filterKey}`,
      async () => {
        const result = await this.expensesRepository.findGroupExpenses(
          groupId,
          page,
          limit,
          filters,
        );
        return {
          ...result,
          data: result.data.map((exp) => ({
            ...exp,
            receiptUrl: (exp as any).attachments?.[0]?.fileUrl,
          })),
        };
      },
      60, // 1 minute cache
    );
  }

  async getExpense(id: string, requestingUserId: string) {
    const expense = await this.expensesRepository.findWithDetails(id);
    if (!expense) throw new NotFoundError('Expense', id);

    // Verify membership
    await this.groupsService.getGroup(expense.groupId!, requestingUserId);
    return {
      ...expense,
      receiptUrl: (expense as any).attachments?.[0]?.fileUrl,
    };
  }

  async createExpense(dto: CreateExpenseDto, payerId: string) {
    // Verify payer is group member
    const group = await this.groupsService.getGroup(dto.groupId, payerId);
    const allowedUserIds = new Set(group.members.map((m) => m.userId));

    const total = Money.of(dto.amount, dto.currency ?? 'USD');

    // Determine splits
    let splits: { userId: string; amount: number; shares?: number }[];

    if (dto.fundingSource === 'GROUP_FUND') {
      dto.splitType = ExpenseSplitType.SHARES;
      dto.splits = [];
    }

    if (dto.splitType === ExpenseSplitType.SHARES && !dto.splits?.length) {
      // Auto-split equally among all members by giving 1 share
      const participants = group.members.map((m) => ({ userId: m.userId, shares: 1 }));
      splits = ExpenseSplitter.split(total, participants, ExpenseSplitType.SHARES, allowedUserIds);
    } else {
      const participants = dto.splits ?? [];
      splits = ExpenseSplitter.split(total, participants, dto.splitType, allowedUserIds);
    }

    const expense = await this.expensesRepository.create(
      {
        groupId: dto.groupId,
        createdBy: payerId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        splitType: dto.splitType,
        categoryId:
          dto.categoryId ||
          (() => {
            throw new Error('Category is required');
          })(),
        fundingSource: dto.fundingSource,
        date: dto.date ? new Date(dto.date) : undefined,
        receiptUrl: dto.receiptUrl,
      },
      splits,
    );

    // Funding source deduction is handled atomically in expensesRepository.create

    // Invalidate cache
    await this.cacheService.invalidateByPattern(`${CacheService.keys.groupExpenses(dto.groupId)}*`);
    await this.cacheService.del(CacheService.keys.settlement(dto.groupId));

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

  async updateExpense(id: string, dto: UpdateExpenseDto, requestingUserId: string) {
    const expense = await this.expensesRepository.findById(id);
    if (!expense) throw new NotFoundError('Expense', id);

    // Only creator can edit
    if (expense.createdBy !== requestingUserId) {
      const group = await this.groupsService.getGroup(expense.groupId!, requestingUserId);
      const members = group.members;
      const isOwner = members.some(
        (m) => m.userId === requestingUserId && m.role === GroupRole.OWNER,
      );
      if (!isOwner) throw new ForbiddenError('Only the creator or group owner can edit an expense');
    }

    let splits: { userId: string; amount: number; shares?: number }[] | undefined;

    const amount = dto.amount ?? Number(expense.amount);
    const currency = dto.currency ?? expense.currency ?? 'USD';
    const splitType = dto.splitType ?? expense.splitType!;
    const total = Money.of(amount, currency);

    // If amount, splitType, or splits change, recalculate
    if (
      dto.amount !== undefined ||
      dto.splitType !== undefined ||
      dto.splits !== undefined ||
      dto.fundingSource === 'GROUP_FUND' ||
      expense.fundingSource === 'GROUP_FUND'
    ) {
      const group = await this.groupsService.getGroup(expense.groupId!, requestingUserId);
      const allowedUserIds = new Set(group.members.map((m) => m.userId));

      let oldSplits: { userId: string; amount: number | string | any; shares?: number | null }[] =
        [];

      const newFundingSource = dto.fundingSource ?? expense.fundingSource;
      if (newFundingSource === 'GROUP_FUND') {
        dto.splitType = ExpenseSplitType.SHARES;
        dto.splits = [];
      }

      if (!dto.splits?.length) {
        oldSplits = await this.expensesRepository.findSplitsByExpenseId(id);
      }

      if (splitType === ExpenseSplitType.SHARES && !dto.splits?.length && !oldSplits?.length) {
        const participants = group.members.map((m) => ({ userId: m.userId, shares: 1 }));
        splits = ExpenseSplitter.split(total, participants, splitType, allowedUserIds);
      } else {
        const participants =
          dto.splits ??
          oldSplits.map((s) => ({
            userId: s.userId!,
            amount: Number(s.amount),
            shares: s.shares ?? undefined,
          }));
        splits = ExpenseSplitter.split(total, participants, splitType, allowedUserIds);
      }
    }

    const updatedExpense = await this.expensesRepository.update(
      id,
      {
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency,
        splitType: dto.splitType,
        categoryId: dto.categoryId,
        fundingSource: dto.fundingSource,
        date: dto.date ? new Date(dto.date) : undefined,
      },
      splits,
    );

    await this.cacheService.invalidateByPattern(
      `${CacheService.keys.groupExpenses(expense.groupId!)}*`,
    );
    await this.cacheService.del(CacheService.keys.settlement(expense.groupId!));

    this.eventEmitter.emit(
      EXPENSE_EVENTS.UPDATED,
      new ExpenseUpdatedEvent(expense.id, expense.groupId!, requestingUserId),
    );

    return updatedExpense;
  }

  async deleteExpense(id: string, requestingUserId: string) {
    const expense = await this.expensesRepository.findById(id);
    if (!expense) throw new NotFoundError('Expense', id);

    // Only creator can delete
    if (expense.createdBy !== requestingUserId) {
      const group = await this.groupsService.getGroup(expense.groupId!, requestingUserId);
      const members = group.members;
      const isOwner = members.some(
        (m) => m.userId === requestingUserId && m.role === GroupRole.OWNER,
      );
      if (!isOwner)
        throw new ForbiddenError('Only the creator or group owner can delete an expense');
    }

    await this.expensesRepository.softDelete(id);
    await this.cacheService.invalidateByPattern(
      `${CacheService.keys.groupExpenses(expense.groupId!)}*`,
    );
    await this.cacheService.del(CacheService.keys.settlement(expense.groupId!));
  }

  async getGroupBalance(groupId: string, requestingUserId: string) {
    await this.groupsService.getGroup(groupId, requestingUserId);
    return this.cacheService.getOrSet(
      CacheService.keys.settlement(groupId),
      () => this.expensesRepository.getGroupBalance(groupId),
      120,
    );
  }

  async getCategories() {
    return this.expensesRepository.findCategories();
  }

  async analyzeReceipt(file: Express.Multer.File) {
    if (!file) {
      throw new Error('No receipt image provided');
    }

    const prompt = `
      You are an expert OCR receipt parser. Extract the following information from the attached receipt image:
      - amount: The total amount paid (number).
      - date: The date of the receipt in YYYY-MM-DD format (string, if available).
      - merchant: The name of the store or merchant. If the merchant name is missing, unreadable, or left blank, generate a concise descriptive title for this expense based on the items or context (e.g., "Hotel Services", "Restaurant Bill", "Taxi Ride", etc.) (string).
      - category: A category for this expense. You MUST choose EXACTLY ONE from the following list: ["Food & Drinks", "Transport", "Accommodation", "Activities", "Shopping", "Entertainment", "Healthcare", "Utilities", "Other"]. Do NOT return any other category.

      Return the result ONLY as a raw JSON object with the keys: amount, date, merchant, category. Do not include markdown code blocks.
    `;

    try {
      const result = await this.geminiService.analyzeImageWithPrompt<{
        amount: number;
        date: string;
        merchant: string;
        category: string;
      }>(file.buffer, file.mimetype, prompt);

      const categories = await this.getCategories();
      const matchedCategory = categories.find(
        (c) => c.name.toLowerCase() === result.category.toLowerCase(),
      );

      const uploadResponse = await this.uploadReceiptEvidence(file);

      return {
        ...result,
        categoryId: matchedCategory?.id,
        receiptUrl: uploadResponse.receiptUrl,
      };
    } catch (error) {
      this.logger.error('Failed to analyze receipt', error);
      throw new Error('Failed to analyze receipt image');
    }
  }

  async uploadReceiptEvidence(file: Express.Multer.File) {
    if (!file) {
      throw new Error('No receipt image provided');
    }
    const uploadResponse = await this.storage.upload({
      key: `receipts/${Date.now()}-${file.originalname}`,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });
    return { receiptUrl: uploadResponse.url };
  }
}
