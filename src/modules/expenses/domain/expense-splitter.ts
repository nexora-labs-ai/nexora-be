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
  ): SplitResult[] {
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
    const splits = participants.map((p) => ({
      userId: p.userId,
      amount: p.amount ?? 0,
      shares: p.shares,
    }));
    const splitTotal = splits.reduce((s, r) => s + r.amount, 0);

    if (Math.abs(splitTotal - total.amount) > 0.01) {
      throw new BusinessRuleError(
        `Split amounts (${splitTotal}) must equal total (${total.amount})`,
      );
    }

    return splits;
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
