import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SettlementsRepository } from './settlements.repository';
import { GroupsService } from '../groups/application/groups.service';
import { CacheService } from '../../shared/infrastructure/cache/cache.service';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import {
  NotFoundError,
  ForbiddenError,
  BusinessRuleError,
} from '../../shared/common/domain-errors';

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
    private readonly cacheService: CacheService,
    private readonly realtimeService: RealtimeService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getGroupSettlements(groupId: string, requestingUserId: string) {
    await this.groupsService.getGroup(groupId, requestingUserId);
    return this.settlementsRepository.findGroupSettlements(groupId);
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
    await this.cacheService.del(CacheService.keys.settlement(settlement.groupId));
    this.realtimeService.notifyGroupSettlementCompleted(settlement.groupId, completed);

    return completed;
  }

  async cancelSettlement(id: string, requestingUserId: string) {
    const settlement = await this.settlementsRepository.findById(id);
    if (!settlement) throw new NotFoundError('Settlement', id);

    if (settlement.fromUserId !== requestingUserId) {
      throw new ForbiddenError('Only the payer can cancel a settlement');
    }

    const cancelled = await this.settlementsRepository.cancel(id);
    await this.cacheService.del(CacheService.keys.settlement(settlement.groupId));

    return cancelled;
  }
}
