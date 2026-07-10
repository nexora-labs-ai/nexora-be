import { Logger } from '@nestjs/common';

export interface GroupBalance {
  userId: string;
  balance: number;
}

export interface OptimizedSettlement {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export class DebtSimplifier {
  private static logger = new Logger(DebtSimplifier.name);

  static simplify(balances: GroupBalance[]): OptimizedSettlement[] {
    // Clone and separate into debtors and creditors
    const debtors = balances.filter((b) => b.balance < -0.01).map((b) => ({ ...b }));
    const creditors = balances.filter((b) => b.balance > 0.01).map((b) => ({ ...b }));

    // Sort to optimize matching largest debts to largest credits
    debtors.sort((a, b) => a.balance - b.balance); // Ascending (most negative first)
    creditors.sort((a, b) => b.balance - a.balance); // Descending (most positive first)

    const settlements: OptimizedSettlement[] = [];

    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]!;
      const creditor = creditors[j]!;

      // Debt amount is the absolute value of balance
      const debt = Math.abs(debtor.balance);
      const credit = creditor.balance;

      const settledAmount = Math.min(debt, credit);

      // Round to 2 decimal places to avoid floating point issues
      const roundedAmount = Math.round(settledAmount * 100) / 100;

      if (roundedAmount > 0) {
        settlements.push({
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amount: roundedAmount,
        });
      }

      debtor.balance += roundedAmount;
      creditor.balance -= roundedAmount;

      // Move to next if fully settled
      if (Math.abs(debtor.balance) < 0.01) {
        i++;
      }
      if (creditor.balance < 0.01) {
        j++;
      }
    }

    return settlements;
  }
}
