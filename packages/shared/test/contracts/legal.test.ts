import { describe, expect, it } from 'vitest';
import {
  LEGAL_BUNDLE_VERSION,
  REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES,
  legalBundleSchema,
  legalDocumentVersionSchema,
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

  it('requires legal document versions to include their locale', () => {
    const result = legalDocumentVersionSchema.safeParse({
      id: '00000000-0000-4000-8000-000000000001',
      legalDocumentId: '00000000-0000-4000-8000-000000000002',
      documentType: 'terms',
      locale: 'sv',
      slug: 'terms',
      title: 'Retaino villkor',
      documentVersion: '2026-05-30',
      effectiveDate: '2026-05-30',
      bodyMdx: '# Villkor',
      contentHash:
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      publicVisible: true,
      acceptanceRequired: true,
      sortOrder: 10,
      publishedAt: null,
      createdAt: '2026-05-30T00:00:00.000Z',
      updatedAt: '2026-05-30T00:00:00.000Z',
    });

    expect(result.success).toBe(true);
  });

  it('includes locale in legal bundle snapshots', () => {
    const result = legalBundleSchema.safeParse({
      version: LEGAL_BUNDLE_VERSION,
      locale: 'en',
      hash: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      documents: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          legalDocumentId: '00000000-0000-4000-8000-000000000002',
          documentType: 'terms',
          locale: 'en',
          slug: 'terms',
          title: 'Retaino Terms and Conditions',
          documentVersion: '2026-05-30',
          effectiveDate: '2026-05-30',
          contentHash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          publicVisible: true,
          acceptanceRequired: true,
          sortOrder: 10,
          publishedAt: null,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
