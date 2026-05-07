import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { legalDocumentVersions } from './legal-document-versions';
import { organizations } from './organizations';
import { users } from './users';

export const organizationAcceptances = pgTable(
  'organization_acceptances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    legalDocumentVersionId: uuid('legal_document_version_id')
      .notNull()
      .references(() => legalDocumentVersions.id),
    documentType: text('document_type').notNull(),
    documentVersion: text('document_version').notNull(),
    contentHash: text('content_hash').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('organization_acceptances_org_document_version_idx').on(
      table.organizationId,
      table.legalDocumentVersionId,
    ),
  ],
);
