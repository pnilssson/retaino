import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  LEGAL_BUNDLE_VERSION,
  REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES,
} from '@retaino/shared/contracts';
import { legalDocuments } from '../../legal/manifest';

const legalRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../legal',
);

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

  it('keeps every current manifest legal document file on disk', () => {
    const manifestPaths = new Set(
      legalDocuments.map((document) => document.path),
    );
    const diskPaths = new Set(readLegalDocumentPaths(legalRoot));

    for (const manifestPath of manifestPaths) {
      expect(diskPaths.has(manifestPath)).toBe(true);
    }
  });

  it('publishes the current localized legal documents as a new rollout version', () => {
    expect(
      legalDocuments.every((document) => document.version === '2026-06-12'),
    ).toBe(true);
  });
});

function readLegalDocumentPaths(directory: string) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return readLegalDocumentPaths(absolutePath).map((relativePath) =>
          path.join(entry.name, relativePath).replaceAll(path.sep, '/'),
        );
      }

      if (entry.isFile() && entry.name.endsWith('.mdx')) {
        return [entry.name];
      }

      return [];
    })
    .sort();
}
