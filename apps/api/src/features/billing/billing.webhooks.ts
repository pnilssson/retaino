import {
  createSmsCreditTransaction,
  getBillingWebhookEventByStripeEventId,
  markBillingWebhookEventProcessed,
  recordBillingWebhookEvent,
  upsertOrganizationBillingProfile,
} from '@retaino/db';
import {
  billingPlanKeySchema,
  billingSubscriptionStatusSchema,
  creditPackKeySchema,
  getBillingPlanCredits,
  getCreditPackCredits,
  type BillingPlanKey,
  type BillingSubscriptionStatus,
} from '@retaino/shared/contracts';
import type Stripe from 'stripe';
import type { AppEnv } from '../../types';

type DbClient = AppEnv['Variables']['db'];

export type BillingWebhookStripeClient = {
  webhooks: {
    constructEventAsync: (
      payload: string,
      header: string,
      secret: string,
    ) => Promise<Stripe.Event>;
  };
};

export type BillingWebhookProcessingResult = {
  status: 'processed' | 'duplicate';
};

export async function verifyStripeWebhookEvent(input: {
  stripe: BillingWebhookStripeClient;
  payload: string;
  signature: string;
  webhookSecret: string;
}) {
  return input.stripe.webhooks.constructEventAsync(
    input.payload,
    input.signature,
    input.webhookSecret,
  );
}

export async function processStripeBillingWebhook(input: {
  db: DbClient;
  event: Stripe.Event;
}): Promise<BillingWebhookProcessingResult> {
  const organizationId = getEventOrganizationId(input.event);
  const recorded = await recordBillingWebhookEvent(input.db, {
    stripeEventId: input.event.id,
    eventType: input.event.type,
    organizationId,
    payload: input.event,
  });

  if (!recorded) {
    const existing = await getBillingWebhookEventByStripeEventId(
      input.db,
      input.event.id,
    );

    if (existing?.status === 'processed') {
      return { status: 'duplicate' };
    }
  }

  await processSupportedEvent(input.db, input.event);
  await markBillingWebhookEventProcessed(input.db, input.event.id);

  return { status: 'processed' };
}

async function processSupportedEvent(db: DbClient, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      return processCheckoutSessionCompleted(
        db,
        event.data.object as Stripe.Checkout.Session,
      );
    case 'invoice.paid':
      return processInvoicePaid(db, event.data.object as Stripe.Invoice);
    case 'invoice.payment_failed':
      return processInvoicePaymentFailed(db, event.data.object as Stripe.Invoice);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return processSubscriptionChanged(
        db,
        event.data.object as Stripe.Subscription,
      );
    case 'charge.refunded':
      return processChargeRefunded(db, event.data.object as Stripe.Charge);
    default:
      return undefined;
  }
}

async function processCheckoutSessionCompleted(
  db: DbClient,
  session: Stripe.Checkout.Session,
) {
  if (
    session.payment_status !== 'paid' ||
    session.metadata?.purpose !== 'credit_pack'
  ) {
    return;
  }

  const organizationId = requiredMetadata(session.metadata, 'organizationId');
  const packKey = parseCreditPackKey(session.metadata.packKey);

  await createSmsCreditTransaction(db, {
    organizationId,
    transactionType: 'grant',
    credits: getCreditPackCredits(packKey),
    creditBucket: 'purchased',
    periodStart: null,
    periodEnd: null,
    source: 'stripe_checkout_session',
    sourceId: session.id,
    description: `${getCreditPackCredits(packKey).toLocaleString('en-US')} credits purchase`,
  });
}

async function processInvoicePaid(db: DbClient, invoice: Stripe.Invoice) {
  if (!isSubscriptionCreditInvoice(invoice)) {
    return;
  }

  const metadata = getInvoiceSubscriptionMetadataOptional(invoice);

  if (!metadata) {
    return;
  }

  const organizationId = requiredMetadata(metadata, 'organizationId');
  const planKey = parseBillingPlanKey(metadata.planKey);
  const subscriptionId = requiredStripeId(getInvoiceSubscriptionId(invoice));
  const periodStart = requiredStripeTimestamp(invoice.period_start);
  const periodEnd = requiredStripeTimestamp(invoice.period_end);

  await createSmsCreditTransaction(db, {
    organizationId,
    transactionType: 'grant',
    credits: getBillingPlanCredits(planKey),
    creditBucket: 'subscription_period',
    periodStart: stripeTimestampToDate(periodStart),
    periodEnd: stripeTimestampToDate(periodEnd),
    source: 'stripe_invoice',
    sourceId: `${subscriptionId}:${periodStart}:${periodEnd}`,
    description: `${capitalizePlanKey(planKey)} monthly credits`,
  });
}

async function processInvoicePaymentFailed(
  db: DbClient,
  invoice: Stripe.Invoice,
) {
  const metadata = getInvoiceSubscriptionMetadataOptional(invoice);

  if (!metadata) {
    return;
  }

  const organizationId = requiredMetadata(metadata, 'organizationId');
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  const stripeCustomerId = getStripeId(invoice.customer);

  if (!stripeCustomerId) {
    return;
  }

  await upsertOrganizationBillingProfile(db, {
    organizationId,
    stripeCustomerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: null,
    planKey: parseOptionalBillingPlanKey(metadata.planKey),
    subscriptionStatus: 'past_due',
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
}

async function processSubscriptionChanged(
  db: DbClient,
  subscription: Stripe.Subscription,
) {
  if (!isRetainoMetadata(subscription.metadata)) {
    return;
  }

  const organizationId = requiredMetadata(subscription.metadata, 'organizationId');
  const planKey = parseBillingPlanKey(subscription.metadata.planKey);
  const item = subscription.items.data[0];
  const stripeCustomerId = getStripeId(subscription.customer);

  if (!stripeCustomerId) {
    return;
  }

  await upsertOrganizationBillingProfile(db, {
    organizationId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: item?.price.id ?? null,
    planKey,
    subscriptionStatus: parseBillingSubscriptionStatus(subscription.status),
    currentPeriodStart: stripeTimestampToDate(item?.current_period_start),
    currentPeriodEnd: stripeTimestampToDate(item?.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function processChargeRefunded(db: DbClient, charge: Stripe.Charge) {
  const organizationId = optionalMetadata(charge.metadata, 'organizationId');
  const packKey = parseOptionalCreditPackKey(charge.metadata?.packKey);

  if (
    !organizationId ||
    !packKey ||
    !charge.refunded ||
    charge.amount_refunded < charge.amount
  ) {
    return;
  }

  await createSmsCreditTransaction(db, {
    organizationId,
    transactionType: 'adjustment',
    credits: -getCreditPackCredits(packKey),
    creditBucket: 'purchased',
    periodStart: null,
    periodEnd: null,
    source: 'stripe_refund',
    sourceId: charge.id,
    description: `${getCreditPackCredits(packKey).toLocaleString('en-US')} credits refund adjustment`,
  });
}

function getEventOrganizationId(event: Stripe.Event) {
  const object = event.data.object as { metadata?: Stripe.Metadata | null };
  const objectOrganizationId = optionalMetadata(object.metadata, 'organizationId');

  if (objectOrganizationId) {
    return objectOrganizationId;
  }

  return optionalMetadata(
    getInvoiceSubscriptionMetadataOptional(object),
    'organizationId',
  );
}

function isSubscriptionCreditInvoice(invoice: Stripe.Invoice) {
  return (
    invoice.billing_reason === 'subscription_create' ||
    invoice.billing_reason === 'subscription_cycle'
  );
}

function getInvoiceSubscriptionMetadataOptional(input: unknown) {
  const parent = (input as { parent?: Stripe.Invoice.Parent | null }).parent;

  if (parent?.type !== 'subscription_details') {
    return null;
  }

  return parent.subscription_details?.metadata ?? null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parent = invoice.parent;

  if (parent?.type !== 'subscription_details') {
    return null;
  }

  return getStripeId(parent.subscription_details?.subscription ?? null);
}

function requiredMetadata(metadata: Stripe.Metadata | null | undefined, key: string) {
  const value = optionalMetadata(metadata, key);

  if (!value) {
    throw new Error(`Stripe metadata ${key} is required.`);
  }

  return value;
}

function requiredStripeId(value: string | null) {
  if (!value) {
    throw new Error('Stripe subscription id is required.');
  }

  return value;
}

function requiredStripeTimestamp(value: number | null | undefined) {
  if (!value) {
    throw new Error('Stripe invoice period is required.');
  }

  return value;
}

function isRetainoMetadata(metadata: Stripe.Metadata | null | undefined) {
  return Boolean(
    optionalMetadata(metadata, 'organizationId') ||
      optionalMetadata(metadata, 'planKey') ||
      optionalMetadata(metadata, 'packKey') ||
      optionalMetadata(metadata, 'purpose'),
  );
}

function optionalMetadata(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
) {
  const value = metadata?.[key]?.trim();
  return value || null;
}

function parseBillingPlanKey(value: string | null | undefined) {
  const parsed = billingPlanKeySchema.safeParse(value);

  if (!parsed.success) {
    throw new Error('Stripe metadata planKey is invalid.');
  }

  return parsed.data;
}

function parseOptionalBillingPlanKey(value: string | null | undefined) {
  const parsed = billingPlanKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseCreditPackKey(value: string | null | undefined) {
  const parsed = creditPackKeySchema.safeParse(value);

  if (!parsed.success) {
    throw new Error('Stripe metadata packKey is invalid.');
  }

  return parsed.data;
}

function parseOptionalCreditPackKey(value: string | null | undefined) {
  const parsed = creditPackKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseBillingSubscriptionStatus(value: string) {
  const parsed = billingSubscriptionStatusSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error('Stripe subscription status is invalid.');
  }

  return parsed.data as BillingSubscriptionStatus;
}

function stripeTimestampToDate(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null;
}

function getStripeId(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function capitalizePlanKey(planKey: BillingPlanKey) {
  return `${planKey.charAt(0).toUpperCase()}${planKey.slice(1)}`;
}
