import { and, asc, desc, eq, lte } from 'drizzle-orm';
import type {
  LegalBundle,
  LegalBundleDocumentSnapshot,
  LegalDocumentType,
  LegalDocumentVersion,
} from '@retaino/shared/contracts';
import {
  LEGAL_BUNDLE_VERSION,
  REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import { legalDocuments, legalDocumentVersions } from '../schema';

type LegalDocumentVersionRow = {
  document: typeof legalDocuments.$inferSelect;
  version: typeof legalDocumentVersions.$inferSelect;
};

function toLegalDocumentVersion(row: LegalDocumentVersionRow): LegalDocumentVersion {
  return {
    id: row.version.id,
    legalDocumentId: row.document.id,
    documentType: row.version.documentType as LegalDocumentType,
    slug: row.document.slug,
    title: row.version.title,
    documentVersion: row.version.documentVersion,
    effectiveDate: row.version.effectiveDate,
    bodyMdx: row.version.bodyMdx,
    contentHash: row.version.contentHash,
    publicVisible: row.document.publicVisible,
    acceptanceRequired: row.document.acceptanceRequired,
    sortOrder: row.document.sortOrder,
    publishedAt: row.version.publishedAt?.toISOString() ?? null,
    createdAt: row.version.createdAt.toISOString(),
    updatedAt: row.version.updatedAt.toISOString(),
  };
}

export async function getLatestPublishedLegalDocumentVersion(
  db: DbClient,
  documentType: string,
  now = new Date(),
) {
  const [row] = await db
    .select({
      document: legalDocuments,
      version: legalDocumentVersions,
    })
    .from(legalDocumentVersions)
    .innerJoin(
      legalDocuments,
      eq(legalDocuments.id, legalDocumentVersions.legalDocumentId),
    )
    .where(
      and(
        eq(legalDocumentVersions.documentType, documentType),
        eq(legalDocumentVersions.status, 'published'),
        eq(legalDocuments.publicVisible, true),
        lte(legalDocumentVersions.effectiveDate, now.toISOString().slice(0, 10)),
      ),
    )
    .orderBy(
      desc(legalDocumentVersions.effectiveDate),
      desc(legalDocumentVersions.publishedAt),
      desc(legalDocumentVersions.createdAt),
    )
    .limit(1);

  return row ? toLegalDocumentVersion(row) : null;
}

export async function getPublishedLegalDocumentVersion(
  db: DbClient,
  input: {
    documentType: string;
    documentVersion: string;
  },
) {
  const [row] = await db
    .select({
      document: legalDocuments,
      version: legalDocumentVersions,
    })
    .from(legalDocumentVersions)
    .innerJoin(
      legalDocuments,
      eq(legalDocuments.id, legalDocumentVersions.legalDocumentId),
    )
    .where(
      and(
        eq(legalDocumentVersions.documentType, input.documentType),
        eq(legalDocumentVersions.documentVersion, input.documentVersion),
        eq(legalDocumentVersions.status, 'published'),
        eq(legalDocuments.publicVisible, true),
      ),
    )
    .limit(1);

  return row ? toLegalDocumentVersion(row) : null;
}

export async function getCurrentRequiredLegalDocumentVersions(
  db: DbClient,
  now = new Date(),
) {
  const rows = await db
    .select({
      document: legalDocuments,
      version: legalDocumentVersions,
    })
    .from(legalDocuments)
    .innerJoin(
      legalDocumentVersions,
      eq(legalDocuments.id, legalDocumentVersions.legalDocumentId),
    )
    .where(
      and(
        eq(legalDocuments.acceptanceRequired, true),
        eq(legalDocuments.publicVisible, true),
        eq(legalDocumentVersions.status, 'published'),
        lte(legalDocumentVersions.effectiveDate, now.toISOString().slice(0, 10)),
      ),
    )
    .orderBy(
      asc(legalDocuments.sortOrder),
      desc(legalDocumentVersions.effectiveDate),
      desc(legalDocumentVersions.publishedAt),
      desc(legalDocumentVersions.createdAt),
    );

  const latestByType = new Map<string, LegalDocumentVersion>();
  const bundleDocumentTypes = new Set<string>(
    REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES,
  );

  for (const row of rows) {
    if (
      bundleDocumentTypes.has(row.document.documentType) &&
      !latestByType.has(row.document.documentType)
    ) {
      latestByType.set(row.document.documentType, toLegalDocumentVersion(row));
    }
  }

  return [...latestByType.values()];
}

export async function getCurrentLegalBundle(
  db: DbClient,
  now = new Date(),
): Promise<LegalBundle> {
  const documents = await getCurrentRequiredLegalDocumentVersions(db, now);
  const snapshots = documents.map(toLegalBundleDocumentSnapshot);
  const hashInput = JSON.stringify({
    version: LEGAL_BUNDLE_VERSION,
    documents: snapshots.map((document) => ({
      documentType: document.documentType,
      documentVersion: document.documentVersion,
      contentHash: document.contentHash,
    })),
  });

  return {
    version: LEGAL_BUNDLE_VERSION,
    hash: await sha256Text(hashInput),
    documents: snapshots,
  };
}

function toLegalBundleDocumentSnapshot(
  document: LegalDocumentVersion,
): LegalBundleDocumentSnapshot {
  return {
    id: document.id,
    legalDocumentId: document.legalDocumentId,
    documentType: document.documentType,
    slug: document.slug,
    title: document.title,
    documentVersion: document.documentVersion,
    effectiveDate: document.effectiveDate,
    contentHash: document.contentHash,
    publicVisible: document.publicVisible,
    acceptanceRequired: document.acceptanceRequired,
    sortOrder: document.sortOrder,
    publishedAt: document.publishedAt,
  };
}

async function sha256Text(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
