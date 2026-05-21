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
import { contacts } from './contacts';
import { organizations } from './organizations';

export const smsMessages = pgTable(
  'sms_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    direction: text('direction').notNull(),
    campaignId: uuid('campaign_id').references(() => campaigns.id, {
      onDelete: 'cascade',
    }),
    recipientId: uuid('recipient_id').references(() => campaignRecipients.id, {
      onDelete: 'set null',
    }),
    contactId: uuid('contact_id').references(() => contacts.id, {
      onDelete: 'set null',
    }),
    provider: text('provider').notNull(),
    providerMessageId: text('provider_message_id'),
    providerMessagingServiceId: text('provider_messaging_service_id'),
    providerPhoneNumberId: text('provider_phone_number_id'),
    fromPhone: text('from_phone'),
    toPhone: text('to_phone').notNull(),
    body: text('body').notNull(),
    status: text('status').notNull(),
    estimatedSegmentCount: integer('estimated_segment_count').notNull(),
    actualSegmentCount: integer('actual_segment_count'),
    estimatedCostMinor: integer('estimated_cost_minor'),
    actualCostMinor: integer('actual_cost_minor'),
    currency: text('currency'),
    queuedAt: timestamp('queued_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('sms_messages_organization_campaign_idx').on(
      table.organizationId,
      table.campaignId,
    ),
    index('sms_messages_organization_received_idx').on(
      table.organizationId,
      table.receivedAt,
    ),
    index('sms_messages_organization_contact_idx').on(
      table.organizationId,
      table.contactId,
    ),
    index('sms_messages_organization_recipient_idx').on(
      table.organizationId,
      table.recipientId,
    ),
    uniqueIndex('sms_messages_provider_message_idx').on(
      table.provider,
      table.providerMessageId,
    ),
    uniqueIndex('sms_messages_campaign_recipient_direction_idx').on(
      table.organizationId,
      table.campaignId,
      table.recipientId,
      table.direction,
    ),
  ],
);
