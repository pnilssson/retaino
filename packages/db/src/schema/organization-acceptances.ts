import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const organizationLegalAcceptances = pgTable(
  'organization_legal_acceptances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    bundleVersion: text('bundle_version').notNull(),
    bundleHash: text('bundle_hash').notNull(),
    documentsSnapshot: jsonb('documents_snapshot').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('organization_legal_acceptances_org_bundle_version_idx').on(
      table.organizationId,
      table.bundleVersion,
    ),
  ],
);
