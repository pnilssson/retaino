import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { legalDocuments } from './legal-documents';

export const legalDocumentVersions = pgTable(
  'legal_document_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    legalDocumentId: uuid('legal_document_id')
      .notNull()
      .references(() => legalDocuments.id, { onDelete: 'cascade' }),
    documentType: text('document_type').notNull(),
    locale: text('locale').notNull().default('sv'),
    documentVersion: text('document_version').notNull(),
    title: text('title').notNull(),
    bodyMdx: text('body_mdx').notNull(),
    contentHash: text('content_hash').notNull(),
    status: text('status').notNull().default('draft'),
    effectiveDate: text('effective_date').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('legal_document_versions_document_id_version_idx').on(
      table.legalDocumentId,
      table.documentVersion,
    ),
    uniqueIndex('legal_document_versions_type_locale_version_idx').on(
      table.documentType,
      table.locale,
      table.documentVersion,
    ),
    index('legal_document_versions_type_locale_status_idx').on(
      table.documentType,
      table.locale,
      table.status,
    ),
  ],
);
