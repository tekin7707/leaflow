import { describe, it, expect } from 'vitest';
import { expandRecurrence } from './recurrence.js';

describe('expandRecurrence', () => {
  const day = (s) => new Date(`${s}T12:00:00.000Z`);

  it('null → single instance on startsAt', () => {
    const dates = expandRecurrence(null, day('2024-01-01'), day('2024-01-10'));
    expect(dates).toHaveLength(1);
  });

  it('DAILY produces 7 instances over a week', () => {
    const dates = expandRecurrence('DAILY', day('2024-01-01'), day('2024-01-07'));
    expect(dates).toHaveLength(7);
  });

  it('WEEKLY:1 (Mondays) gives ~4 instances over a month', () => {
    const dates = expandRecurrence('WEEKLY:1', day('2024-01-01'), day('2024-01-31'));
    // Jan 2024 mondays: 1, 8, 15, 22, 29 → 5
    expect(dates).toHaveLength(5);
    for (const d of dates) expect(d.getDay()).toBe(1);
  });

  it('MONTHLY:15 hits the 15th of any month in window', () => {
    const dates = expandRecurrence('MONTHLY:15', day('2024-01-01'), day('2024-03-31'));
    expect(dates).toHaveLength(3);
    for (const d of dates) expect(d.getDate()).toBe(15);
  });

  it('returns empty when end before start', () => {
    expect(expandRecurrence('DAILY', day('2024-02-10'), day('2024-02-01'))).toEqual([]);
  });
});
