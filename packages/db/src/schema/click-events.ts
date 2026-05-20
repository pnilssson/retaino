import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { campaignRecipients, campaigns } from './campaigns';
import { createdAt } from './common';
import { organizations } from './organizations';
import { trackingLinks } from './tracking-links';

export const clickEvents = pgTable(
  'click_events',
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
    trackingLinkId: uuid('tracking_link_id')
      .notNull()
      .references(() => trackingLinks.id, { onDelete: 'cascade' }),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt,
  },
  (table) => [
    index('click_events_organization_campaign_idx').on(
      table.organizationId,
      table.campaignId,
    ),
    index('click_events_tracking_link_idx').on(table.trackingLinkId),
  ],
);
