import {
  addUtcDays,
  getInclusiveUtcDayCount,
  parseUtcDateOnly,
  toUtcDateOnly,
} from './date-only.utils';

describe('date-only utilities', () => {
  it('parses and normalizes valid values at UTC midnight', () => {
    expect(parseUtcDateOnly('2026-12-01').toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(toUtcDateOnly(new Date('2026-12-01T18:30:00.000Z')).toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
  });

  it.each(['2026-02-30', '2026-13-01', 'not-a-date'])('rejects invalid value %s', (value) => {
    expect(() => parseUtcDateOnly(value)).toThrow(RangeError);
  });

  it('calculates inclusive calendar days without time-of-day inflation', () => {
    const start = new Date('2026-12-01T08:00:00.000Z');
    const end = new Date('2026-12-02T18:00:00.000Z');

    expect(getInclusiveUtcDayCount(start, end)).toBe(2);
    expect(addUtcDays(start, 2).toISOString()).toBe('2026-12-03T00:00:00.000Z');
  });
});
