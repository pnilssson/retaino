import { describe, expect, it } from 'vitest';
import {
  LEGAL_BUNDLE_VERSION,
  REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES,
  LEGAL_DOCUMENT_TYPES,
} from '@retaino/shared/contracts';

describe('legal document contracts', () => {
  it('keeps only stable document type constants in shared contracts', () => {
    expect(LEGAL_DOCUMENT_TYPES).toEqual([
      'terms',
      'privacy',
      'cookies',
      'dpa',
      'subprocessors',
      'transfer_terms',
      'sending_policy',
      'campaign_attestation',
      'customer_privacy_notice_guide',
    ]);
    expect(LEGAL_BUNDLE_VERSION).toBe('2026-06-12');
    expect(REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES).toEqual([
      'terms',
      'dpa',
      'subprocessors',
      'transfer_terms',
      'sending_policy',
    ]);
  });
});
