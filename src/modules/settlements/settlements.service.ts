import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/common/domain-errors';
import { CacheService } from '../../shared/infrastructure/cache/cache.service';
import { STORAGE_PORT, StoragePort } from '../../shared/infrastructure/ports/storage.port';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { ExpensesService } from '../expenses/application/expenses.service';
import { GroupsService } from '../groups/application/groups.service';
import { DebtSimplifier } from './domain/debt-simplifier';
import { SettlementsRepository } from './settlements.repository';

export const SETTLEMENT_EVENTS = {
  REQUESTED: 'settlement.requested',
  REMINDED: 'settlement.reminded',
  COMPLETED: 'settlement.completed',
  CANCELLED: 'settlement.cancelled',
} as const;

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    private readonly settlementsRepository: SettlementsRepository,
    private readonly groupsService: GroupsService,
    private readonly expensesService: ExpensesService,
    private readonly cacheService: CacheService,
    private readonly realtimeService: RealtimeService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async getGroupSettlements(groupId: string, requestingUserId: string) {
    await this.groupsService.getGroup(groupId, requestingUserId);
    return this.settlementsRepository.findGroupSettlements(groupId);
  }

  async getOptimizedSettlements(groupId: string, requestingUserId: string) {
    const [balances, groupSettlements] = await Promise.all([
      this.expensesService.getGroupBalance(groupId, requestingUserId),
      this.settlementsRepository.findGroupSettlements(groupId),
    ]);

    const numericBalances = balances.map((b: { userId: string; balance: number }) => ({
      userId: b.userId,
      balance: Number(b.balance),
    }));

    // 1. Simplify based on TRUE balances (excluding pending)
    const optimized = DebtSimplifier.simplify(numericBalances);

    const pendingByPair = new Map<string, number>();
    for (const s of groupSettlements.filter((s) => s.status === 'PENDING')) {
      const k = `${s.fromUserId}:${s.toUserId}`;
      pendingByPair.set(k, (pendingByPair.get(k) ?? 0) + Number(s.amount));
    }

    return optimized.map((o) => {
      const pendingAmount = pendingByPair.get(`${o.fromUserId}:${o.toUserId}`) ?? 0;
      return {
        ...o,
        amount: o.amount,
        pendingAmount,
        remainingAmount: Math.max(o.amount - pendingAmount, 0),
      };
    });
  }

  async requestSettlement(
    groupId: string,
    fromUserId: string,
    toUserId: string,
    amount: number,
    currency: string,
    note?: string,
  ) {
    await this.groupsService.getGroup(groupId, fromUserId);

    if (fromUserId === toUserId) {
      throw new BusinessRuleError('Cannot settle with yourself');
    }

    const existing = await this.settlementsRepository.findPendingBetween(
      groupId,
      fromUserId,
      toUserId,
    );
    if (existing) {
      throw new ConflictError('A pending settlement already exists between these members');
    }

    const settlement = await this.settlementsRepository.create({
      groupId,
      fromUserId,
      toUserId,
      amount,
      currency,
      note,
    });

    this.eventEmitter.emit(SETTLEMENT_EVENTS.REQUESTED, settlement);
    await this.cacheService.del(CacheService.keys.settlement(groupId));

    return settlement;
  }

  async remindSettlement(groupId: string, fromUserId: string, targetUserId: string) {
    const group = await this.groupsService.getGroup(groupId, fromUserId);

    if (!group.members.some((m) => m.userId === targetUserId)) {
      throw new NotFoundError('GroupMember', targetUserId);
    }

    if (fromUserId === targetUserId) {
      throw new BusinessRuleError('Cannot remind yourself');
    }

    const debts = await this.getOptimizedSettlements(groupId, fromUserId);
    const debt = debts.find((d) => d.fromUserId === targetUserId && d.toUserId === fromUserId);
    if (!debt || debt.amount <= 0) {
      throw new BusinessRuleError('This member does not owe you anything');
    }

    const cacheKey = `settlement:remind:${groupId}:${fromUserId}:${targetUserId}`;
    const recentlyReminded = await this.cacheService.get(cacheKey);
    if (recentlyReminded) {
      throw new BusinessRuleError('Please wait before sending another reminder');
    }

    // Rate limit reminder to once per hour (3600 seconds)
    await this.cacheService.set(cacheKey, true, 3600);

    this.eventEmitter.emit(SETTLEMENT_EVENTS.REMINDED, {
      groupId,
      fromUserId,
      targetUserId,
      amount: debt.amount,
      currency: group.currency,
    });

    return { success: true, amount: debt.amount };
  }

  async completeSettlement(id: string, requestingUserId: string) {
    const settlement = await this.settlementsRepository.findById(id);
    if (!settlement) throw new NotFoundError('Settlement', id);

    // Only the recipient (toUser) can confirm receipt
    if (settlement.toUserId !== requestingUserId) {
      throw new ForbiddenError('Only the payee can confirm a settlement');
    }

    const completed = await this.settlementsRepository.complete(id);

    this.eventEmitter.emit(SETTLEMENT_EVENTS.COMPLETED, completed);
    await this.cacheService.del(CacheService.keys.settlement(settlement.groupId!));
    this.realtimeService.notifyGroupSettlementCompleted(settlement.groupId!, completed);

    return completed;
  }

  async cancelSettlement(id: string, requestingUserId: string) {
    const settlement = await this.settlementsRepository.findById(id);
    if (!settlement) throw new NotFoundError('Settlement', id);

    if (settlement.fromUserId !== requestingUserId && settlement.toUserId !== requestingUserId) {
      throw new ForbiddenError('Only the payer or payee can cancel/reject a settlement');
    }

    const cancelled = await this.settlementsRepository.cancel(id);
    await this.cacheService.del(CacheService.keys.settlement(settlement.groupId!));

    // Clear remind rate limit so creditor can remind again immediately if they rejected
    const remindCacheKey = `settlement:remind:${settlement.groupId}:${settlement.toUserId}:${settlement.fromUserId}`;
    await this.cacheService.del(remindCacheKey);

    return cancelled;
  }

  async uploadEvidence(id: string, file: Express.Multer.File, requestingUserId: string) {
    const settlement = await this.settlementsRepository.findById(id);
    if (!settlement) throw new NotFoundError('Settlement', id);

    if (settlement.fromUserId !== requestingUserId) {
      throw new ForbiddenError('Only the payer can upload evidence');
    }

    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const key = `settlements/${id}-${Date.now()}.${fileExtension}`;
    const uploadResponse = await this.storage.upload({
      key,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const updated = await this.settlementsRepository.updateEvidence(id, uploadResponse.url);
    await this.cacheService.del(CacheService.keys.settlement(settlement.groupId!));

    return updated;
  }
}
