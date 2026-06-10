import { ExpenseSplitType } from '@prisma/client';
import { BusinessRuleError } from '../../../shared/common/domain-errors';
import { Money } from '../../../shared/common/value-objects/money';

export interface SplitInput {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

export interface SplitResult {
  userId: string;
  amount: number;
}

export class ExpenseSplitter {
  static split(
    total: Money,
    participants: SplitInput[],
    splitType: ExpenseSplitType,
  ): SplitResult[] {
    switch (splitType) {
      case ExpenseSplitType.EQUAL:
        return this.splitEqual(total, participants);
      case ExpenseSplitType.EXACT:
        return this.splitExact(total, participants);
      case ExpenseSplitType.PERCENTAGE:
        return this.splitByPercentage(total, participants);
      case ExpenseSplitType.SHARES:
        return this.splitByShares(total, participants);
      default:
        throw new BusinessRuleError(`Unknown split type: ${splitType}`);
    }
  }

  private static splitEqual(total: Money, participants: SplitInput[]): SplitResult[] {
    if (participants.length === 0) throw new BusinessRuleError('No participants');
    const perPerson = Math.round((total.amount / participants.length) * 100) / 100;
    const results = participants.map((p) => ({ userId: p.userId, amount: perPerson }));

    // Adjust for rounding
    const totalSplit = results.reduce((s, r) => s + r.amount, 0);
    const diff = Math.round((total.amount - totalSplit) * 100) / 100;
    if (diff !== 0) results[0].amount = Math.round((results[0].amount + diff) * 100) / 100;

    return results;
  }

  private static splitExact(total: Money, participants: SplitInput[]): SplitResult[] {
    const splits = participants.map((p) => ({
      userId: p.userId,
      amount: p.amount ?? 0,
    }));
    const splitTotal = splits.reduce((s, r) => s + r.amount, 0);

    if (Math.abs(splitTotal - total.amount) > 0.01) {
      throw new BusinessRuleError(
        `Split amounts (${splitTotal}) must equal total (${total.amount})`,
      );
    }

    return splits;
  }

  private static splitByPercentage(total: Money, participants: SplitInput[]): SplitResult[] {
    const totalPct = participants.reduce((s, p) => s + (p.percentage ?? 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new BusinessRuleError(`Percentages must sum to 100, got ${totalPct}`);
    }

    return participants.map((p) => ({
      userId: p.userId,
      amount: Math.round((total.amount * ((p.percentage ?? 0) / 100)) * 100) / 100,
    }));
  }

  private static splitByShares(total: Money, participants: SplitInput[]): SplitResult[] {
    const totalShares = participants.reduce((s, p) => s + (p.shares ?? 1), 0);
    return participants.map((p) => ({
      userId: p.userId,
      amount:
        Math.round((total.amount * ((p.shares ?? 1) / totalShares)) * 100) / 100,
    }));
  }
}
