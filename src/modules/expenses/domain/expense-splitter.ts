import { ExpenseSplitType } from '@prisma/client';
import { BusinessRuleError } from '../../../shared/common/domain-errors';
import { Money } from '../../../shared/common/value-objects/money';

export interface SplitInput {
  userId: string;
  amount?: number;
  shares?: number;
}

export interface SplitResult {
  userId: string;
  amount: number;
  shares?: number;
}

export class ExpenseSplitter {
  static split(
    total: Money,
    participants: SplitInput[],
    splitType: ExpenseSplitType,
    allowedUserIds?: Set<string>,
  ): SplitResult[] {
    if (!participants.length) {
      throw new BusinessRuleError('Expense must have at least one split participant');
    }

    if (allowedUserIds) {
      const invalid = participants.filter((p) => !allowedUserIds.has(p.userId));
      if (invalid.length > 0) {
        throw new BusinessRuleError(
          `Split contains users who are not active members: ${invalid.map((s) => s.userId).join(', ')}`,
        );
      }
    }

    switch (splitType) {
      case ExpenseSplitType.EXACT:
        return this.splitExact(total, participants);
      case ExpenseSplitType.SHARES:
        return this.splitByShares(total, participants);
      default:
        throw new BusinessRuleError(`Unknown split type: ${splitType}`);
    }
  }

  private static splitExact(total: Money, participants: SplitInput[]): SplitResult[] {
    const totalCents = Math.round(total.amount * 100);
    const cents = participants.map((p) => Math.round((p.amount ?? 0) * 100));
    const sum = cents.reduce((s, c) => s + c, 0);

    // Allow maximum 1 cent discrepancy per person due to frontend rounding
    if (Math.abs(sum - totalCents) > participants.length) {
      throw new BusinessRuleError(
        `Split amounts (${sum / 100}) must equal total (${total.amount})`,
      );
    }

    // Reconcile remainder to the last participant to ensure exact match
    if (cents.length > 0) {
      cents[cents.length - 1] += totalCents - sum;
    }

    return participants.map((p, i) => ({
      userId: p.userId,
      amount: cents[i]! / 100,
      shares: p.shares,
    }));
  }

  private static splitByShares(total: Money, participants: SplitInput[]): SplitResult[] {
    const totalShares = participants.reduce((s, p) => s + (p.shares ?? 1), 0);
    const totalCents = Math.round(total.amount * 100);
    let distributedCents = 0;

    const splits = participants.map((p, index) => {
      const shares = p.shares ?? 1;
      let cents = 0;

      if (index === participants.length - 1) {
        cents = totalCents - distributedCents;
      } else {
        cents = Math.round(totalCents * (shares / totalShares));
        distributedCents += cents;
      }

      return {
        userId: p.userId,
        amount: cents / 100,
        shares,
      };
    });

    return splits;
  }
}
