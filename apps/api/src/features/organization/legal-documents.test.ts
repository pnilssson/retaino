import { describe, expect, it } from 'vitest';
import {
  REQUIRED_COMPLIANCE_DOCUMENT_TYPES,
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
    ]);
    expect(REQUIRED_COMPLIANCE_DOCUMENT_TYPES).toEqual([
      'terms',
      'dpa',
      'subprocessors',
      'transfer_terms',
      'sending_policy',
      'campaign_attestation',
    ]);
  });
});
