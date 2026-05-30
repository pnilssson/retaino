import { describe, expect, it } from 'vitest';
import {
  BILLING_PLAN_CATALOG,
  BILLING_PLAN_KEYS,
  SMS_CREDIT_TRANSACTION_SOURCES,
  SMS_CREDIT_TRANSACTION_TYPES,
  billingStatusResponseSchema,
  createSubscriptionCheckoutSchema,
  getBillingPlanCredits,
  hasCurrentBillingSubscription,
  smsCreditTransactionSchema,
} from '../../src/contracts';

describe('billing contracts', () => {
  it('defines the MVP subscription plans and included SMS credits', () => {
    expect(BILLING_PLAN_KEYS).toEqual([
      'starter',
      'core',
      'growth',
      'pro',
      'scale',
      'advanced',
    ]);
    expect(BILLING_PLAN_CATALOG).toMatchObject({
      starter: {
        label: 'Starter',
        monthlyPriceSek: 999,
        includedSmsCredits: 500,
      },
      core: {
        label: 'Core',
        monthlyPriceSek: 1999,
        includedSmsCredits: 1000,
      },
      growth: {
        label: 'Growth',
        monthlyPriceSek: 2999,
        includedSmsCredits: 1500,
      },
      pro: {
        label: 'Pro',
        monthlyPriceSek: 4999,
        includedSmsCredits: 2500,
      },
      scale: {
        label: 'Scale',
        monthlyPriceSek: 7999,
        includedSmsCredits: 4000,
      },
      advanced: {
        label: 'Advanced',
        monthlyPriceSek: 14999,
        includedSmsCredits: 7500,
      },
    });
    expect(getBillingPlanCredits('growth')).toBe(1500);
  });

  it('validates checkout request payloads strictly', () => {
    expect(
      createSubscriptionCheckoutSchema.parse({ planKey: 'starter' }),
    ).toEqual({ planKey: 'starter' });
    expect(
      createSubscriptionCheckoutSchema.safeParse({ planKey: 'enterprise' })
        .success,
    ).toBe(false);
    expect(
      createSubscriptionCheckoutSchema.safeParse({
        planKey: 'growth',
        organizationId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(false);
  });

  it('validates billing status responses', () => {
    expect(
      billingStatusResponseSchema.parse({
        subscription: {
          status: 'active',
          planKey: 'growth',
          currentPeriodEnd: '2026-06-14T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
        smsCredits: {
          balance: 1200,
        },
        portalAvailable: true,
      }),
    ).toMatchObject({
      subscription: {
        status: 'active',
        planKey: 'growth',
      },
      smsCredits: {
        balance: 1200,
      },
    });

    expect(
      billingStatusResponseSchema.safeParse({
        subscription: {
          status: 'active',
          planKey: 'growth',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
        smsCredits: {
          balance: 1.5,
        },
        portalAvailable: true,
      }).success,
    ).toBe(false);
  });

  it('identifies statuses that represent a current subscription', () => {
    expect(hasCurrentBillingSubscription('active')).toBe(true);
    expect(hasCurrentBillingSubscription('trialing')).toBe(true);
    expect(hasCurrentBillingSubscription('canceled')).toBe(false);
    expect(hasCurrentBillingSubscription('incomplete_expired')).toBe(false);
    expect(hasCurrentBillingSubscription('none')).toBe(false);
  });

  it('allows only known SMS credit transaction sources', () => {
    expect(SMS_CREDIT_TRANSACTION_TYPES).toEqual([
      'grant',
      'debit',
      'adjustment',
    ]);
    expect(SMS_CREDIT_TRANSACTION_SOURCES).toEqual([
      'stripe_invoice',
      'campaign_send',
      'campaign_test_send',
      'manual_reply',
      'manual_adjustment',
    ]);
    expect(
      smsCreditTransactionSchema.parse({
        transactionType: 'grant',
        source: 'stripe_invoice',
        sourceId: 'in_123',
        credits: 1000,
        periodStart: '2026-05-14T00:00:00.000Z',
        periodEnd: '2026-06-14T00:00:00.000Z',
        description: 'Growth monthly credits',
        createdAt: '2026-05-14T00:00:00.000Z',
      }),
    ).toMatchObject({
      transactionType: 'grant',
      source: 'stripe_invoice',
      credits: 1000,
    });
    expect(
      smsCreditTransactionSchema.safeParse({
        transactionType: 'grant',
        source: 'unknown',
        sourceId: 'evt_123',
        credits: 1000,
        description: 'Unknown source',
        createdAt: '2026-05-14T00:00:00.000Z',
      }).success,
    ).toBe(false);
    expect(
      smsCreditTransactionSchema.safeParse({
        transactionType: 'unknown',
        source: 'stripe_invoice',
        sourceId: 'in_123',
        credits: 1000,
        description: 'Unknown type',
        createdAt: '2026-05-14T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});
