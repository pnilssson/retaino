import { describe, expect, it } from 'vitest';
import {
  BILLING_PLAN_CATALOG,
  BILLING_PLAN_KEYS,
  CREDIT_PACK_CATALOG,
  CREDIT_PACK_KEYS,
  SMS_CREDIT_BUCKETS,
  SMS_CREDIT_TRANSACTION_SOURCES,
  SMS_CREDIT_TRANSACTION_TYPES,
  billingStatusResponseSchema,
  createCreditCheckoutSchema,
  createSubscriptionCheckoutSchema,
  getBillingPlanCredits,
  getCreditPackCredits,
  smsCreditTransactionSchema,
} from '../../src/contracts';

describe('billing contracts', () => {
  it('defines the MVP subscription plans and included SMS credits', () => {
    expect(BILLING_PLAN_KEYS).toEqual(['starter', 'growth', 'scale']);
    expect(BILLING_PLAN_CATALOG).toMatchObject({
      starter: {
        monthlyPriceSek: 699,
        includedSmsCredits: 300,
      },
      growth: {
        monthlyPriceSek: 1499,
        includedSmsCredits: 1000,
      },
      scale: {
        monthlyPriceSek: 2999,
        includedSmsCredits: 3000,
      },
    });
    expect(getBillingPlanCredits('growth')).toBe(1000);
  });

  it('defines the MVP credit packs', () => {
    expect(CREDIT_PACK_KEYS).toEqual([
      'credits_500',
      'credits_1500',
      'credits_5000',
    ]);
    expect(CREDIT_PACK_CATALOG).toMatchObject({
      credits_500: {
        priceSek: 595,
        smsCredits: 500,
      },
      credits_1500: {
        priceSek: 1650,
        smsCredits: 1500,
      },
      credits_5000: {
        priceSek: 5000,
        smsCredits: 5000,
      },
    });
    expect(getCreditPackCredits('credits_5000')).toBe(5000);
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

    expect(createCreditCheckoutSchema.parse({ packKey: 'credits_1500' })).toEqual(
      { packKey: 'credits_1500' },
    );
    expect(
      createCreditCheckoutSchema.safeParse({ packKey: 'credits_999' }).success,
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

  it('allows only known SMS credit transaction sources', () => {
    expect(SMS_CREDIT_TRANSACTION_TYPES).toEqual([
      'grant',
      'debit',
      'adjustment',
    ]);
    expect(SMS_CREDIT_BUCKETS).toEqual(['subscription_period', 'purchased']);
    expect(SMS_CREDIT_TRANSACTION_SOURCES).toEqual([
      'stripe_invoice',
      'stripe_checkout_session',
      'campaign_send',
      'campaign_test_send',
      'stripe_refund',
      'stripe_credit_note',
      'manual_adjustment',
    ]);
    expect(
      smsCreditTransactionSchema.parse({
        transactionType: 'grant',
        source: 'stripe_invoice',
        sourceId: 'in_123',
        creditBucket: 'subscription_period',
        credits: 1000,
        periodStart: '2026-05-14T00:00:00.000Z',
        periodEnd: '2026-06-14T00:00:00.000Z',
        description: 'Growth monthly credits',
        createdAt: '2026-05-14T00:00:00.000Z',
      }),
    ).toMatchObject({
      transactionType: 'grant',
      source: 'stripe_invoice',
      creditBucket: 'subscription_period',
      credits: 1000,
    });
    expect(
      smsCreditTransactionSchema.parse({
        transactionType: 'grant',
        source: 'stripe_checkout_session',
        sourceId: 'cs_123',
        creditBucket: 'purchased',
        credits: 1500,
        periodStart: null,
        periodEnd: null,
        description: '1,500 credits purchase',
        createdAt: '2026-05-14T00:00:00.000Z',
      }),
    ).toMatchObject({
      source: 'stripe_checkout_session',
      creditBucket: 'purchased',
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
