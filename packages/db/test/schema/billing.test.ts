import { describe, expect, it } from 'vitest';
import {
  billingWebhookEvents,
  organizationBillingProfiles,
  smsCreditTransactions,
} from '../../src/schema/billing';

describe('billing schema', () => {
  it('keeps every billing table organization scoped where possible', () => {
    expect(organizationBillingProfiles.organizationId.name).toBe(
      'organization_id',
    );
    expect(billingWebhookEvents.organizationId.name).toBe('organization_id');
    expect(smsCreditTransactions.organizationId.name).toBe('organization_id');
  });

  it('stores Stripe billing projection', () => {
    expect(organizationBillingProfiles.stripeCustomerId.name).toBe(
      'stripe_customer_id',
    );
    expect(organizationBillingProfiles.stripeSubscriptionId.name).toBe(
      'stripe_subscription_id',
    );
    expect(organizationBillingProfiles.subscriptionStatus.name).toBe(
      'subscription_status',
    );
  });

  it('stores webhooks idempotently and keeps full payloads for audit', () => {
    expect(billingWebhookEvents.stripeEventId.name).toBe('stripe_event_id');
    expect(billingWebhookEvents.eventType.name).toBe('event_type');
    expect(billingWebhookEvents.payload.name).toBe('payload');
    expect(billingWebhookEvents.processedAt.name).toBe('processed_at');
  });

  it('stores SMS credits as append-only transactions', () => {
    expect(smsCreditTransactions.transactionType.name).toBe('transaction_type');
    expect(smsCreditTransactions.credits.name).toBe('credits');
    expect(smsCreditTransactions.source.name).toBe('source');
    expect(smsCreditTransactions.sourceId.name).toBe('source_id');
    expect(smsCreditTransactions.periodStart.name).toBe('period_start');
    expect(smsCreditTransactions.periodEnd.name).toBe('period_end');
    expect('balance' in smsCreditTransactions).toBe(false);
    expect('creditBucket' in smsCreditTransactions).toBe(false);
  });
});
