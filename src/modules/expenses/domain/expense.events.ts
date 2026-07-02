export class ExpenseCreatedEvent {
  constructor(
    public readonly expenseId: string,
    public readonly groupId: string,
    public readonly payerId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly splitUserIds: string[],
  ) {}
}

export class ExpenseDeletedEvent {
  constructor(
    public readonly expenseId: string,
    public readonly groupId: string,
  ) {}
}

export class ExpenseUpdatedEvent {
  constructor(
    public readonly expenseId: string,
    public readonly groupId: string,
    public readonly updaterId: string,
  ) {}
}

export const EXPENSE_EVENTS = {
  CREATED: 'expense.created',
  UPDATED: 'expense.updated',
  DELETED: 'expense.deleted',
} as const;
