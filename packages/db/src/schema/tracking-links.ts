import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { campaigns, campaignRecipients } from './campaigns';
import { createdAt, updatedAt } from './common';
import { organizations } from './organizations';

export const trackingLinks = pgTable(
  'tracking_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => campaignRecipients.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    targetUrl: text('target_url').notNull(),
    phoneHash: text('phone_hash'),
    emailHash: text('email_hash'),
    firstClickedAt: timestamp('first_clicked_at', { withTimezone: true }),
    lastClickedAt: timestamp('last_clicked_at', { withTimezone: true }),
    clickCount: integer('click_count').notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('tracking_links_code_idx').on(table.code),
    uniqueIndex('tracking_links_recipient_idx').on(
      table.organizationId,
      table.recipientId,
    ),
    index('tracking_links_organization_campaign_idx').on(
      table.organizationId,
      table.campaignId,
    ),
  ],
);
