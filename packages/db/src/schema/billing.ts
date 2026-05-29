import {
  boolean,
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

export const organizationBillingProfiles = pgTable(
  'organization_billing_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripePriceId: text('stripe_price_id'),
    planKey: text('plan_key'),
    subscriptionStatus: text('subscription_status').notNull().default('none'),
    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('organization_billing_profiles_organization_id_idx').on(
      table.organizationId,
    ),
    uniqueIndex('organization_billing_profiles_stripe_customer_id_idx').on(
      table.stripeCustomerId,
    ),
    index('organization_billing_profiles_subscription_status_idx').on(
      table.subscriptionStatus,
    ),
  ],
);

export const billingWebhookEvents = pgTable(
  'billing_webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stripeEventId: text('stripe_event_id').notNull(),
    eventType: text('event_type').notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('received'),
    payload: jsonb('payload').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('billing_webhook_events_stripe_event_id_idx').on(
      table.stripeEventId,
    ),
    index('billing_webhook_events_organization_id_idx').on(table.organizationId),
    index('billing_webhook_events_event_type_idx').on(table.eventType),
    index('billing_webhook_events_status_idx').on(table.status),
  ],
);

export const smsCreditTransactions = pgTable(
  'sms_credit_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    transactionType: text('transaction_type').notNull(),
    credits: integer('credits').notNull(),
    source: text('source').notNull(),
    sourceId: text('source_id').notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    description: text('description').notNull(),
    createdAt,
  },
  (table) => [
    index('sms_credit_transactions_organization_created_idx').on(
      table.organizationId,
      table.createdAt,
    ),
    uniqueIndex('sms_credit_transactions_source_idx').on(
      table.organizationId,
      table.source,
      table.sourceId,
      table.periodStart,
      table.periodEnd,
    ),
  ],
);
