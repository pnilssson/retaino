import { describe, expect, it } from 'vitest';
import { apiError } from './errors';

describe('apiError', () => {
  it('returns a stable API error envelope without details', () => {
    expect(apiError('unauthorized', 'Authentication is required.')).toEqual({
      error: {
        code: 'unauthorized',
        message: 'Authentication is required.',
      },
    });
  });

  it('includes validation details when provided', () => {
    expect(apiError('validation_failed', 'Invalid request.', { field: 'phone' })).toEqual({
      error: {
        code: 'validation_failed',
        message: 'Invalid request.',
        details: { field: 'phone' },
      },
    });
  });
});
