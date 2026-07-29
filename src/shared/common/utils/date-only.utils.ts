export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function toUtcDateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function parseUtcDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Invalid date-only value');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError('Invalid date-only value');
  }

  return parsed;
}

export function addUtcDays(value: Date, days: number): Date {
  return new Date(toUtcDateOnly(value).getTime() + days * DAY_IN_MS);
}

export function getInclusiveUtcDayCount(start: Date, end: Date): number {
  const startDate = toUtcDateOnly(start);
  const endDate = toUtcDateOnly(end);
  return Math.floor((endDate.getTime() - startDate.getTime()) / DAY_IN_MS) + 1;
}
