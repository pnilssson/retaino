import { index, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import type { CampaignAudienceRule } from '@retaino/shared/contracts';
import { createdAt, updatedAt } from './common';
import { organizations } from './organizations';
import { users } from './users';

export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: text('status').notNull().default('draft'),
    audienceRule: jsonb('audience_rule')
      .$type<CampaignAudienceRule>()
      .notNull(),
    smsBody: text('sms_body').notNull(),
    bookingUrl: text('booking_url').notNull(),
    campaignCode: text('campaign_code'),
    attributionWindowDays: integer('attribution_window_days')
      .notNull()
      .default(7),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('campaigns_organization_created_idx').on(
      table.organizationId,
      table.createdAt,
    ),
    index('campaigns_organization_status_idx').on(
      table.organizationId,
      table.status,
    ),
  ],
);
