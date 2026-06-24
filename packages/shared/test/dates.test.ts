import { describe, expect, it } from 'vitest';
import { dateOnlyToUtcDate } from '../src';

describe('date helpers', () => {
  it('converts date-only values to UTC midnight dates', () => {
    expect(dateOnlyToUtcDate('2026-05-23')).toEqual(
      new Date('2026-05-23T00:00:00.000Z'),
    );
  });
});
