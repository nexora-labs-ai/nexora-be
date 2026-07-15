import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BusinessRuleError,
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

    // 2. Subtract pending payments from the resulting debts to hide the Settle Up button
    const pendingSettlements = groupSettlements.filter((s) => s.status === 'PENDING');

    for (const pending of pendingSettlements) {
      // Find a matching simplified debt where pending payer is supposed to pay pending payee
      const matchIndex = optimized.findIndex(
        (o) => o.fromUserId === pending.fromUserId && o.toUserId === pending.toUserId,
      );

      if (matchIndex !== -1) {
        const match = optimized[matchIndex];
        if (match) {
          match.amount -= Number(pending.amount);
          if (match.amount <= 0) {
            optimized.splice(matchIndex, 1);
          }
        }
      }
    }

    return optimized;
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

    if (settlement.fromUserId !== requestingUserId) {
      throw new ForbiddenError('Only the payer can cancel a settlement');
    }

    const cancelled = await this.settlementsRepository.cancel(id);
    await this.cacheService.del(CacheService.keys.settlement(settlement.groupId!));

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
