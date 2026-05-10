import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { organizations } from './organizations';

export const organizationProfiles = pgTable(
  'organization_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    legalName: text('legal_name').notNull(),
    registrationNumber: text('registration_number').notNull(),
    billingEmail: text('billing_email').notNull(),
    responsibleName: text('responsible_name').notNull(),
    responsibleEmail: text('responsible_email').notNull(),
    responsiblePhone: text('responsible_phone'),
    countryCode: text('country_code').notNull().default('SE'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('organization_profiles_organization_id_idx').on(table.organizationId),
  ],
);
