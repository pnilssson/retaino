import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkOrganizationId: text('clerk_organization_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug'),
    onboardingStatus: text('onboarding_status').notNull().default('profile_required'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('organizations_clerk_organization_id_idx').on(table.clerkOrganizationId),
  ],
);
