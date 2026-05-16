import { describe, expect, it } from 'vitest';
import { apiErrorCodeSchema } from '../../src/schemas';

describe('api error schemas', () => {
  it('accepts conflict for state-dependent request failures', () => {
    expect(apiErrorCodeSchema.safeParse('conflict').success).toBe(true);
  });
});
