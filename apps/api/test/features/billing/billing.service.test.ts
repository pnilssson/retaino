import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getOrganizationBillingProfile,
  getSmsCreditBalance,
  getSmsCreditBalanceBreakdown,
  createSmsCreditTransaction,
  upsertOrganizationBillingProfile,
} from '@retaino/db';
import { getStripeBillingCatalog } from '../../../src/features/billing/billing.catalog';
import {
  createCreditCheckout,
  assertOrganizationCanSpendSmsCredits,
  BillingSubscriptionAlreadyExistsError,
  createSubscriptionCheckout,
  debitSmsCreditUsage,
  getBillingStatus,
  BillingInsufficientCreditsError,
  BillingSubscriptionRequiredError,
} from '../../../src/features/billing/billing.service';
import type { StripeConfig } from '../../../src/lib/stripe';

vi.mock('@retaino/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@retaino/db')>();

  return {
    ...actual,
    getOrganizationBillingProfile: vi.fn(),
    getSmsCreditBalance: vi.fn(),
    getSmsCreditBalanceBreakdown: vi.fn(),
    createSmsCreditTransaction: vi.fn(),
    upsertOrganizationBillingProfile: vi.fn(),
  };
});

const db = {} as never;
const organization = {
  id: '22222222-2222-4222-8222-222222222222',
  clerkOrganizationId: 'org_123',
  name: 'Retaino Test',
  slug: 'retaino-test',
  onboardingStatus: 'complete',
  role: 'org:admin',
};
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  clerkUserId: 'user_123',
  email: 'ada@retaino.test',
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
};
const config: StripeConfig = {
  secretKey: 'sk_test_123',
  webhookSecret: 'whsec_123',
  successUrl: 'https://retaino.test/app/settings/billing/success',
  cancelUrl: 'https://retaino.test/app/settings/billing',
  returnUrl: 'https://retaino.test/app/settings/billing',
  checkoutDisplayName: 'Retaino',
};
const catalog = getStripeBillingCatalog({
  STRIPE_PRICE_CREDITS_1500_ID: 'price_credits_1500',
  STRIPE_PRICE_CREDITS_5000_ID: 'price_credits_5000',
  STRIPE_PRICE_CREDITS_500_ID: 'price_credits_500',
  STRIPE_PRICE_GROWTH_ID: 'price_growth',
  STRIPE_PRICE_SCALE_ID: 'price_scale',
  STRIPE_PRICE_STARTER_ID: 'price_starter',
});

function fakeStripe() {
  return {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_123' }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://checkout.test/123' }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://portal.test/123' }),
      },
    },
  };
}

describe('billing service', () => {
  beforeEach(() => {
    vi.mocked(getOrganizationBillingProfile).mockReset();
    vi.mocked(getSmsCreditBalance).mockReset();
    vi.mocked(getSmsCreditBalanceBreakdown).mockReset();
    vi.mocked(createSmsCreditTransaction).mockReset();
    vi.mocked(upsertOrganizationBillingProfile).mockReset();
  });

  it('returns local billing status and SMS credit balance', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      organizationId: organization.id,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      stripePriceId: 'price_growth',
      planKey: 'growth',
      subscriptionStatus: 'active',
      currentPeriodStart: new Date('2026-05-15T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-15T00:00:00.000Z'),
      cancelAtPeriodEnd: false,
      syncedAt: new Date('2026-05-15T00:00:00.000Z'),
      createdAt: new Date('2026-05-15T00:00:00.000Z'),
      updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    vi.mocked(getSmsCreditBalance).mockResolvedValue(1200);

    await expect(
      getBillingStatus({ db, organizationId: organization.id }),
    ).resolves.toEqual({
      subscription: {
        status: 'active',
        planKey: 'growth',
        currentPeriodEnd: '2026-06-15T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      },
      smsCredits: { balance: 1200 },
      portalAvailable: true,
    });
  });

  it('creates a subscription checkout session for the active organization', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(null);
    vi.mocked(upsertOrganizationBillingProfile).mockResolvedValue(null);
    const stripe = fakeStripe();

    await expect(
      createSubscriptionCheckout({
        db,
        stripe,
        config,
        catalog,
        organization,
        user,
        planKey: 'growth',
      }),
    ).resolves.toEqual({ url: 'https://checkout.test/123' });

    expect(stripe.customers.create).toHaveBeenCalledWith({
      name: organization.name,
      email: user.email,
      metadata: {
        organizationId: organization.id,
        clerkOrganizationId: organization.clerkOrganizationId,
      },
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_123',
        success_url: config.successUrl,
        cancel_url: config.cancelUrl,
        client_reference_id: organization.id,
        line_items: [{ price: 'price_growth', quantity: 1 }],
        automatic_tax: { enabled: true },
        tax_id_collection: { enabled: true },
        metadata: {
          organizationId: organization.id,
          purpose: 'subscription',
          planKey: 'growth',
        },
        subscription_data: {
          metadata: {
            organizationId: organization.id,
            planKey: 'growth',
          },
        },
      }),
    );
  });

  it('blocks subscription checkout when an active subscription already exists', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      organizationId: organization.id,
      stripeCustomerId: 'cus_existing',
      stripeSubscriptionId: 'sub_existing',
      stripePriceId: 'price_growth',
      planKey: 'growth',
      subscriptionStatus: 'active',
      currentPeriodStart: new Date('2026-05-15T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-15T00:00:00.000Z'),
      cancelAtPeriodEnd: false,
      syncedAt: new Date('2026-05-15T00:00:00.000Z'),
      createdAt: new Date('2026-05-15T00:00:00.000Z'),
      updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    const stripe = fakeStripe();

    await expect(
      createSubscriptionCheckout({
        db,
        stripe,
        config,
        catalog,
        organization,
        user,
        planKey: 'scale',
      }),
    ).rejects.toBeInstanceOf(BillingSubscriptionAlreadyExistsError);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('creates a credit pack checkout session with payment metadata', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      organizationId: organization.id,
      stripeCustomerId: 'cus_existing',
      stripeSubscriptionId: null,
      stripePriceId: null,
      planKey: null,
      subscriptionStatus: 'none',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      syncedAt: new Date('2026-05-15T00:00:00.000Z'),
      createdAt: new Date('2026-05-15T00:00:00.000Z'),
      updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    const stripe = fakeStripe();

    await createCreditCheckout({
      db,
      stripe,
      config,
      catalog,
      organization,
      user,
      packKey: 'credits_1500',
    });

    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        customer: 'cus_existing',
        line_items: [{ price: 'price_credits_1500', quantity: 1 }],
        automatic_tax: { enabled: true },
        tax_id_collection: { enabled: true },
        metadata: {
          organizationId: organization.id,
          purpose: 'credit_pack',
          packKey: 'credits_1500',
        },
        payment_intent_data: {
          metadata: {
            organizationId: organization.id,
            packKey: 'credits_1500',
          },
        },
      }),
    );
  });

  it('allows campaign spending when subscription and credits are enough', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      organizationId: organization.id,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      stripePriceId: 'price_growth',
      planKey: 'growth',
      subscriptionStatus: 'active',
      currentPeriodStart: new Date('2026-05-15T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-15T00:00:00.000Z'),
      cancelAtPeriodEnd: false,
      syncedAt: new Date('2026-05-15T00:00:00.000Z'),
      createdAt: new Date('2026-05-15T00:00:00.000Z'),
      updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    vi.mocked(getSmsCreditBalance).mockResolvedValue(500);

    await expect(
      assertOrganizationCanSpendSmsCredits({
        db,
        organizationId: organization.id,
        estimatedSegments: 300,
      }),
    ).resolves.toEqual({ balance: 500 });
  });

  it('blocks campaign spending without an active subscription', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(null);
    vi.mocked(getSmsCreditBalance).mockResolvedValue(500);

    await expect(
      assertOrganizationCanSpendSmsCredits({
        db,
        organizationId: organization.id,
        estimatedSegments: 300,
      }),
    ).rejects.toBeInstanceOf(BillingSubscriptionRequiredError);
  });

  it('blocks campaign spending when credits are insufficient', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      organizationId: organization.id,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      stripePriceId: 'price_growth',
      planKey: 'growth',
      subscriptionStatus: 'active',
      currentPeriodStart: new Date('2026-05-15T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-15T00:00:00.000Z'),
      cancelAtPeriodEnd: false,
      syncedAt: new Date('2026-05-15T00:00:00.000Z'),
      createdAt: new Date('2026-05-15T00:00:00.000Z'),
      updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    vi.mocked(getSmsCreditBalance).mockResolvedValue(250);

    await expect(
      assertOrganizationCanSpendSmsCredits({
        db,
        organizationId: organization.id,
        estimatedSegments: 300,
      }),
    ).rejects.toMatchObject({
      balance: 250,
      requiredCredits: 300,
    });
    await expect(
      assertOrganizationCanSpendSmsCredits({
        db,
        organizationId: organization.id,
        estimatedSegments: 300,
      }),
    ).rejects.toBeInstanceOf(BillingInsufficientCreditsError);
  });

  it('debits actual SMS segment usage from current subscription credits first', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      organizationId: organization.id,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      stripePriceId: 'price_growth',
      planKey: 'growth',
      subscriptionStatus: 'active',
      currentPeriodStart: new Date('2026-05-15T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-15T00:00:00.000Z'),
      cancelAtPeriodEnd: false,
      syncedAt: new Date('2026-05-15T00:00:00.000Z'),
      createdAt: new Date('2026-05-15T00:00:00.000Z'),
      updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    vi.mocked(getSmsCreditBalanceBreakdown).mockResolvedValue({
      subscriptionPeriod: 100,
      purchased: 500,
      total: 600,
    });
    vi.mocked(createSmsCreditTransaction).mockResolvedValue({
      transactionType: 'debit',
      source: 'campaign_send',
      sourceId: 'campaign_send_123',
      credits: -42,
      creditBucket: 'subscription_period',
      periodStart: '2026-05-15T00:00:00.000Z',
      periodEnd: '2026-06-15T00:00:00.000Z',
      description: 'Campaign SMS usage',
      createdAt: '2026-05-15T00:00:00.000Z',
    });

    await expect(
      debitSmsCreditUsage({
        db,
        organizationId: organization.id,
        actualSegments: 42,
        sourceId: 'campaign_send_123',
      }),
    ).resolves.toHaveLength(1);
    expect(createSmsCreditTransaction).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      transactionType: 'debit',
      credits: -42,
      creditBucket: 'subscription_period',
      periodStart: new Date('2026-05-15T00:00:00.000Z'),
      periodEnd: new Date('2026-06-15T00:00:00.000Z'),
      source: 'campaign_send',
      sourceId: 'campaign_send_123',
      description: 'Campaign SMS usage',
    });
  });

  it('splits SMS debit rows when usage crosses subscription and purchased credits', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      organizationId: organization.id,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      stripePriceId: 'price_growth',
      planKey: 'growth',
      subscriptionStatus: 'active',
      currentPeriodStart: new Date('2026-05-15T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-15T00:00:00.000Z'),
      cancelAtPeriodEnd: false,
      syncedAt: new Date('2026-05-15T00:00:00.000Z'),
      createdAt: new Date('2026-05-15T00:00:00.000Z'),
      updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    vi.mocked(getSmsCreditBalanceBreakdown).mockResolvedValue({
      subscriptionPeriod: 30,
      purchased: 500,
      total: 530,
    });
    vi.mocked(createSmsCreditTransaction).mockResolvedValue(null);

    await debitSmsCreditUsage({
      db,
      organizationId: organization.id,
      actualSegments: 42,
      sourceId: 'campaign_send_123',
    });

    expect(createSmsCreditTransaction).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        credits: -30,
        creditBucket: 'subscription_period',
        sourceId: 'campaign_send_123',
      }),
    );
    expect(createSmsCreditTransaction).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        credits: -12,
        creditBucket: 'purchased',
        periodStart: null,
        periodEnd: null,
        sourceId: 'campaign_send_123',
      }),
    );
  });
});
