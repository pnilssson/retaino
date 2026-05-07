import { and, asc, desc, eq, lte } from 'drizzle-orm';
import type {
  LegalDocumentType,
  LegalDocumentVersion,
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

  for (const row of rows) {
    if (!latestByType.has(row.document.documentType)) {
      latestByType.set(row.document.documentType, toLegalDocumentVersion(row));
    }
  }

  return [...latestByType.values()];
}
