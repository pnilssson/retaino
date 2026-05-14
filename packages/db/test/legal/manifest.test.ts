import { describe, expect, it } from 'vitest';
import {
  LEGAL_BUNDLE_VERSION,
  REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES,
} from '@retaino/shared/contracts';
import { legalDocuments } from '../../legal/manifest';

describe('legal document manifest', () => {
  it('bumps the acceptance bundle when required legal documents change', () => {
    const requiredBundleTypes = new Set<string>(
      REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES,
    );
    const requiredDocumentVersions = legalDocuments
      .filter(
        (document) =>
          document.acceptanceRequired &&
          requiredBundleTypes.has(document.documentType),
      )
      .map((document) => document.version);

    expect(requiredDocumentVersions).toContain(LEGAL_BUNDLE_VERSION);
    expect(
      requiredDocumentVersions.every(
        (documentVersion) => documentVersion <= LEGAL_BUNDLE_VERSION,
      ),
    ).toBe(true);
  });
});
