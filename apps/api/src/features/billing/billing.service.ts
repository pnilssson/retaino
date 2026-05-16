import {
  billingProfileToContract,
  createSmsCreditTransaction,
  getOrganizationBillingProfile,
  getSmsCreditBalance,
  getSmsCreditBalanceBreakdown,
  upsertOrganizationBillingProfile,
} from '@retaino/db';
import { hasCurrentBillingSubscription } from '@retaino/shared/contracts';
import type {
  BillingCheckoutUrlResponse,
  BillingPlanKey,
  BillingPortalUrlResponse,
  BillingStatusResponse,
  CreditPackKey,
  OrganizationContext,
  User,
} from '@retaino/shared/contracts';
import type Stripe from 'stripe';
import type { StripeBillingCatalog } from './billing.catalog';
import type { StripeConfig } from '../../lib/stripe';
import type { AppEnv } from '../../types';

export type BillingStripeClient = {
  customers: {
    create: (
      params: Stripe.CustomerCreateParams,
    ) => Promise<{ id: string }>;
  };
  checkout: {
    sessions: {
      create: (
        params: Stripe.Checkout.SessionCreateParams,
      ) => Promise<{ url: string | null }>;
    };
  };
  billingPortal: {
    sessions: {
      create: (
        params: Stripe.BillingPortal.SessionCreateParams,
      ) => Promise<{ url: string | null }>;
    };
  };
};

type DbClient = AppEnv['Variables']['db'];

export class BillingCustomerMissingError extends Error {
  constructor() {
    super('Billing customer is not available.');
    this.name = 'BillingCustomerMissingError';
  }
}

export class BillingSessionUrlMissingError extends Error {
  constructor() {
    super('Stripe did not return a redirect URL.');
    this.name = 'BillingSessionUrlMissingError';
  }
}

export class BillingSubscriptionRequiredError extends Error {
  constructor() {
    super('An active subscription is required to spend SMS credits.');
    this.name = 'BillingSubscriptionRequiredError';
  }
}

export class BillingSubscriptionAlreadyExistsError extends Error {
  constructor() {
    super('Organization already has an active subscription.');
    this.name = 'BillingSubscriptionAlreadyExistsError';
  }
}

export class BillingInsufficientCreditsError extends Error {
  readonly balance: number;
  readonly requiredCredits: number;

  constructor(input: { balance: number; requiredCredits: number }) {
    super('SMS credit balance is too low.');
    this.name = 'BillingInsufficientCreditsError';
    this.balance = input.balance;
    this.requiredCredits = input.requiredCredits;
  }
}

export async function getBillingStatus(input: {
  db: DbClient;
  organizationId: string;
}): Promise<BillingStatusResponse> {
  const [profile, balance] = await Promise.all([
    getOrganizationBillingProfile(input.db, input.organizationId),
    getSmsCreditBalance(input.db, input.organizationId),
  ]);

  return {
    subscription: billingProfileToContract(profile),
    smsCredits: {
      balance,
    },
    portalAvailable: Boolean(profile?.stripeCustomerId),
  };
}

export async function createSubscriptionCheckout(input: {
  db: DbClient;
  stripe: BillingStripeClient;
  config: StripeConfig;
  catalog: StripeBillingCatalog;
  organization: OrganizationContext;
  user: User;
  planKey: BillingPlanKey;
}): Promise<BillingCheckoutUrlResponse> {
  const profile = await getOrganizationBillingProfile(
    input.db,
    input.organization.id,
  );

  if (hasCurrentBillingSubscription(profile?.subscriptionStatus)) {
    throw new BillingSubscriptionAlreadyExistsError();
  }

  const customerId = await ensureStripeCustomer(input);
  const plan = input.catalog.plans[input.planKey];
  const session = await input.stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    success_url: input.config.successUrl,
    cancel_url: input.config.cancelUrl,
    client_reference_id: input.organization.id,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: 'auto',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
    branding_settings: {
      display_name: input.config.checkoutDisplayName,
    },
    metadata: {
      organizationId: input.organization.id,
      purpose: 'subscription',
      planKey: input.planKey,
    },
    subscription_data: {
      billing_mode: { type: 'flexible' },
      metadata: {
        organizationId: input.organization.id,
        planKey: input.planKey,
      },
    },
  });

  return checkoutUrlResponse(session.url);
}

export async function createCreditCheckout(input: {
  db: DbClient;
  stripe: BillingStripeClient;
  config: StripeConfig;
  catalog: StripeBillingCatalog;
  organization: OrganizationContext;
  user: User;
  packKey: CreditPackKey;
}): Promise<BillingCheckoutUrlResponse> {
  const customerId = await ensureStripeCustomer(input);
  const pack = input.catalog.creditPacks[input.packKey];
  const session = await input.stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    success_url: input.config.successUrl,
    cancel_url: input.config.cancelUrl,
    client_reference_id: input.organization.id,
    line_items: [{ price: pack.stripePriceId, quantity: 1 }],
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: 'auto',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
    branding_settings: {
      display_name: input.config.checkoutDisplayName,
    },
    metadata: {
      organizationId: input.organization.id,
      purpose: 'credit_pack',
      packKey: input.packKey,
    },
    payment_intent_data: {
      metadata: {
        organizationId: input.organization.id,
        packKey: input.packKey,
      },
    },
  });

  return checkoutUrlResponse(session.url);
}

export async function createCustomerPortalSession(input: {
  db: DbClient;
  stripe: BillingStripeClient;
  config: StripeConfig;
  organizationId: string;
}): Promise<BillingPortalUrlResponse> {
  const profile = await getOrganizationBillingProfile(
    input.db,
    input.organizationId,
  );

  if (!profile?.stripeCustomerId) {
    throw new BillingCustomerMissingError();
  }

  const session = await input.stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: input.config.returnUrl,
  });

  return checkoutUrlResponse(session.url);
}

export async function assertOrganizationCanSpendSmsCredits(input: {
  db: DbClient;
  organizationId: string;
  estimatedSegments: number;
}) {
  const [profile, balance] = await Promise.all([
    getOrganizationBillingProfile(input.db, input.organizationId),
    getSmsCreditBalance(input.db, input.organizationId),
  ]);

  if (profile?.subscriptionStatus !== 'active') {
    throw new BillingSubscriptionRequiredError();
  }

  if (balance < input.estimatedSegments) {
    throw new BillingInsufficientCreditsError({
      balance,
      requiredCredits: input.estimatedSegments,
    });
  }

  return { balance };
}

export async function debitSmsCreditUsage(input: {
  db: DbClient;
  organizationId: string;
  actualSegments: number;
  sourceId: string;
}) {
  const [profile, balance] = await Promise.all([
    getOrganizationBillingProfile(input.db, input.organizationId),
    getSmsCreditBalanceBreakdown(input.db, input.organizationId),
  ]);
  const canUseSubscriptionPeriod = Boolean(
    profile?.currentPeriodStart && profile.currentPeriodEnd,
  );
  const subscriptionDebit = canUseSubscriptionPeriod
    ? Math.min(input.actualSegments, Math.max(balance.subscriptionPeriod, 0))
    : 0;
  const purchasedDebit = input.actualSegments - subscriptionDebit;
  const transactions = [];

  if (
    subscriptionDebit > 0 &&
    profile?.currentPeriodStart &&
    profile.currentPeriodEnd
  ) {
    transactions.push(
      await createSmsCreditTransaction(input.db, {
        organizationId: input.organizationId,
        transactionType: 'debit',
        credits: -subscriptionDebit,
        creditBucket: 'subscription_period',
        periodStart: profile.currentPeriodStart,
        periodEnd: profile.currentPeriodEnd,
        source: 'campaign_send',
        sourceId: input.sourceId,
        description: 'Campaign SMS usage',
      }),
    );
  }

  if (purchasedDebit > 0) {
    transactions.push(
      await createSmsCreditTransaction(input.db, {
        organizationId: input.organizationId,
        transactionType: 'debit',
        credits: -purchasedDebit,
        creditBucket: 'purchased',
        periodStart: null,
        periodEnd: null,
        source: 'campaign_send',
        sourceId: input.sourceId,
        description: 'Campaign SMS usage',
      }),
    );
  }

  return transactions;
}

async function ensureStripeCustomer(input: {
  db: DbClient;
  stripe: BillingStripeClient;
  organization: OrganizationContext;
  user: User;
}) {
  const profile = await getOrganizationBillingProfile(
    input.db,
    input.organization.id,
  );

  if (profile?.stripeCustomerId) {
    return profile.stripeCustomerId;
  }

  const customerInput: Stripe.CustomerCreateParams = {
    name: input.organization.name,
    metadata: {
      organizationId: input.organization.id,
      clerkOrganizationId: input.organization.clerkOrganizationId,
    },
  };

  if (input.user.email) {
    customerInput.email = input.user.email;
  }

  const customer = await input.stripe.customers.create(customerInput);

  await upsertOrganizationBillingProfile(input.db, {
    organizationId: input.organization.id,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: null,
    stripePriceId: null,
    planKey: null,
    subscriptionStatus: 'none',
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });

  return customer.id;
}

function checkoutUrlResponse(url: string | null) {
  if (!url) {
    throw new BillingSessionUrlMissingError();
  }

  return { url };
}
