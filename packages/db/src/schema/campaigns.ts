import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { CampaignAudienceRule } from '@retaino/shared/contracts';
import { createdAt, updatedAt } from './common';
import { contacts } from './contacts';
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
    smsBody: text('sms_body'),
    bookingUrl: text('booking_url'),
    campaignCode: text('campaign_code'),
    attributionWindowDays: integer('attribution_window_days')
      .notNull()
      .default(7),
    readyToSendAt: timestamp('ready_to_send_at', { withTimezone: true }),
    readyToSendByUserId: uuid('ready_to_send_by_user_id').references(
      () => users.id,
      { onDelete: 'set null' },
    ),
    sendStartedAt: timestamp('send_started_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    reservedCreditCount: integer('reserved_credit_count'),
    actualCreditCount: integer('actual_credit_count'),
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

export const campaignRecipients = pgTable(
  'campaign_recipients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => contacts.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('selected'),
    exclusionReason: text('exclusion_reason'),
    name: text('name'),
    phone: text('phone'),
    email: text('email'),
    normalizedPhone: text('normalized_phone'),
    normalizedEmail: text('normalized_email'),
    phoneHash: text('phone_hash'),
    emailHash: text('email_hash'),
    lastBookingAt: timestamp('last_booking_at', { withTimezone: true }),
    lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
    selectedAt: timestamp('selected_at', { withTimezone: true }),
    queuedAt: timestamp('queued_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('campaign_recipients_organization_campaign_idx').on(
      table.organizationId,
      table.campaignId,
    ),
    index('campaign_recipients_organization_status_idx').on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    eventType: text('event_type').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt,
  },
  (table) => [
    index('audit_logs_organization_created_idx').on(
      table.organizationId,
      table.createdAt,
    ),
    index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  ],
);
