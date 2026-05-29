import { describe, expect, it } from 'vitest';
import {
  LEGAL_BUNDLE_VERSION,
  REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES,
} from '../../src/contracts';

describe('legal contracts', () => {
  it('defines the current acceptance bundle version', () => {
    expect(LEGAL_BUNDLE_VERSION).toBe('2026-05-30');
  });

  it('keeps the acceptance bundle scoped to required documents only', () => {
    expect(REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES).toEqual([
      'terms',
      'dpa',
      'subprocessors',
      'transfer_terms',
      'sending_policy',
    ]);
  });
});
