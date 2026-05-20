import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { campaignRecipients, campaigns } from './campaigns';
import { createdAt } from './common';
import { organizations } from './organizations';
import { smsMessages } from './sms-messages';

export const campaignMessageEvents = pgTable(
  'campaign_message_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, {
      onDelete: 'set null',
    }),
    messageId: uuid('message_id').references(() => smsMessages.id, {
      onDelete: 'set null',
    }),
    recipientId: uuid('recipient_id').references(() => campaignRecipients.id, {
      onDelete: 'set null',
    }),
    provider: text('provider').notNull(),
    providerMessageId: text('provider_message_id').notNull(),
    eventType: text('event_type').notNull(),
    rawStatus: text('raw_status'),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt,
  },
  (table) => [
    index('campaign_message_events_provider_message_idx').on(
      table.provider,
      table.providerMessageId,
    ),
    index('campaign_message_events_organization_campaign_idx').on(
      table.organizationId,
      table.campaignId,
    ),
  ],
);
