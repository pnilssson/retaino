import { describe, expect, it } from 'vitest';

import { timestampSchema } from '../../src/schemas/primitives';

describe('timestampSchema', () => {
  it('accepts ISO datetimes with time zone offsets', () => {
    expect(timestampSchema.safeParse('2026-05-10T19:30:00.000Z').success).toBe(
      true,
    );
    expect(timestampSchema.safeParse('2026-05-10T21:30:00+02:00').success).toBe(
      true,
    );
  });

  it('rejects empty or non-date strings', () => {
    expect(timestampSchema.safeParse('').success).toBe(false);
    expect(timestampSchema.safeParse('not-a-date').success).toBe(false);
  });
});
