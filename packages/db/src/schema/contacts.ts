import {
  sql,
} from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { organizations } from './organizations';
import { users } from './users';

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name'),
    phone: text('phone'),
    email: text('email'),
    normalizedPhone: text('normalized_phone'),
    normalizedEmail: text('normalized_email'),
    phoneHash: text('phone_hash'),
    emailHash: text('email_hash'),
    lastBookingAt: timestamp('last_booking_at', { withTimezone: true }),
    lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
    consentStatus: text('consent_status').notNull().default('unknown'),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('contacts_organization_id_idx').on(table.organizationId),
    index('contacts_organization_last_contacted_idx').on(
      table.organizationId,
      table.lastContactedAt,
    ),
    index('contacts_organization_last_booking_idx').on(
      table.organizationId,
      table.lastBookingAt,
    ),
    uniqueIndex('contacts_organization_phone_hash_idx')
      .on(table.organizationId, table.phoneHash)
      .where(sql`phone_hash is not null`),
    uniqueIndex('contacts_organization_email_hash_idx')
      .on(table.organizationId, table.emailHash)
      .where(sql`email_hash is not null`),
  ],
);

export const contactImports = pgTable(
  'contact_imports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('processing'),
    fileKey: text('file_key'),
    phoneCountryCode: text('phone_country_code').notNull().default('SE'),
    mapping: jsonb('mapping'),
    totalRows: integer('total_rows').notNull().default(0),
    processedRows: integer('processed_rows').notNull().default(0),
    createdCount: integer('created_count').notNull().default(0),
    updatedCount: integer('updated_count').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),
    invalidCount: integer('invalid_count').notNull().default(0),
    duplicateCount: integer('duplicate_count').notNull().default(0),
    suppressedCount: integer('suppressed_count').notNull().default(0),
    errorSummary: jsonb('error_summary').notNull().default([]),
    permissionAttestedAt: timestamp('permission_attested_at', {
      withTimezone: true,
    }),
    permissionAttestedByUserId: uuid('permission_attested_by_user_id').references(
      () => users.id,
      { onDelete: 'set null' },
    ),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('contact_imports_organization_created_idx').on(
      table.organizationId,
      table.createdAt,
    ),
    index('contact_imports_organization_status_idx').on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const suppressions = pgTable(
  'suppressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    value: text('value').notNull(),
    normalizedValue: text('normalized_value').notNull(),
    valueHash: text('value_hash').notNull(),
    reason: text('reason').notNull(),
    source: text('source'),
    createdAt,
  },
  (table) => [
    uniqueIndex('suppressions_organization_type_hash_idx').on(
      table.organizationId,
      table.type,
      table.valueHash,
    ),
    index('suppressions_organization_created_idx').on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);
