import {
  clearOrganizationSmsSenderReleaseSchedule,
  claimBillingWebhookEventProcessing,
  createSmsCreditTransaction,
  markBillingWebhookEventFailed,
  markBillingWebhookEventProcessed,
  scheduleOrganizationSmsSenderRelease,
  upsertOrganizationBillingProfile,
} from '@retaino/db';
import {
  billingPlanKeySchema,
  billingSubscriptionStatusSchema,
  getBillingPlanCredits,
  type BillingPlanKey,
  type BillingSubscriptionStatus,
} from '@retaino/shared/contracts';
import type Stripe from 'stripe';
import type { AppEnv } from '../../types';

type DbClient = AppEnv['Variables']['db'];
const SMS_SENDER_RELEASE_GRACE_DAYS = 3;

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
  senderReleaseDueOrganizationId?: string;
};

export class BillingWebhookProcessingInProgressError extends Error {
  constructor() {
    super('Stripe event is already processing.');
    this.name = 'BillingWebhookProcessingInProgressError';
  }
}

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
  const claimed = await claimBillingWebhookEventProcessing(input.db, {
    stripeEventId: input.event.id,
    eventType: input.event.type,
    organizationId,
    payload: input.event,
  });

  if (claimed.claimStatus === 'processed') {
    return { status: 'duplicate' };
  }

  if (claimed.claimStatus === 'processing') {
    throw new BillingWebhookProcessingInProgressError();
  }

  try {
    const senderReleaseDueOrganizationId = await processSupportedEvent(
      input.db,
      input.event,
    );
    await markBillingWebhookEventProcessed(input.db, input.event.id);

    return {
      status: 'processed',
      ...(senderReleaseDueOrganizationId
        ? { senderReleaseDueOrganizationId }
        : {}),
    };
  } catch (error) {
    await markBillingWebhookEventFailed(input.db, input.event.id);
    throw error;
  }
}

async function processSupportedEvent(db: DbClient, event: Stripe.Event) {
  switch (event.type) {
    case 'invoice.paid':
      return processInvoicePaid(db, event.data.object as Stripe.Invoice);
    case 'invoice.payment_failed':
      return processInvoicePaymentFailed(db, event.data.object as Stripe.Invoice);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
      return processSubscriptionChanged(
        db,
        event.data.object as Stripe.Subscription,
      );
    default:
      return null;
  }
}

async function processInvoicePaid(db: DbClient, invoice: Stripe.Invoice) {
  if (!isSubscriptionCreditInvoice(invoice)) {
    return null;
  }

  const metadata = getInvoiceSubscriptionMetadataOptional(invoice);

  if (!metadata) {
    return null;
  }

  const organizationId = requiredMetadata(metadata, 'organizationId');
  const planKey = parseBillingPlanKey(metadata.planKey);
  const subscriptionId = requiredStripeId(getInvoiceSubscriptionId(invoice));
  const period = getInvoiceSubscriptionCreditPeriod(invoice);
  const periodStart = requiredDate(stripeTimestampToDate(period.start));
  const periodEnd = requiredDate(stripeTimestampToDate(period.end));

  await createSmsCreditTransaction(db, {
    organizationId,
    transactionType: 'grant',
    credits: getBillingPlanCredits(planKey),
    periodStart,
    periodEnd: rolloverPeriodEnd(periodStart, periodEnd),
    source: 'stripe_invoice',
    sourceId: `${subscriptionId}:${period.start}:${period.end}`,
    description: `${capitalizePlanKey(planKey)} monthly credits`,
  });
  return null;
}

async function processInvoicePaymentFailed(
  db: DbClient,
  invoice: Stripe.Invoice,
) {
  const metadata = getInvoiceSubscriptionMetadataOptional(invoice);

  if (!metadata) {
    return null;
  }

  const organizationId = requiredMetadata(metadata, 'organizationId');
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  const stripeCustomerId = getStripeId(invoice.customer);

  if (!stripeCustomerId) {
    return null;
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
  await scheduleOrganizationSmsSenderRelease(db, {
    organizationId,
    provider: 'twilio',
    status: 'ready',
    releaseScheduledAt: smsSenderReleaseGraceDeadline(),
    preserveEarlierSchedule: true,
  });
  return null;
}

async function processSubscriptionChanged(
  db: DbClient,
  subscription: Stripe.Subscription,
) {
  if (!isRetainoMetadata(subscription.metadata)) {
    return null;
  }

  const organizationId = requiredMetadata(subscription.metadata, 'organizationId');
  const planKey = parseBillingPlanKey(subscription.metadata.planKey);
  const item = subscription.items.data[0];
  const stripeCustomerId = getStripeId(subscription.customer);

  if (!stripeCustomerId) {
    return null;
  }

  const subscriptionStatus = parseBillingSubscriptionStatus(subscription.status);
  const currentPeriodEnd = stripeTimestampToDate(item?.current_period_end);

  await upsertOrganizationBillingProfile(db, {
    organizationId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: item?.price.id ?? null,
    planKey,
    subscriptionStatus,
    currentPeriodStart: stripeTimestampToDate(item?.current_period_start),
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
  return syncSenderReleaseScheduleForSubscription(db, {
    organizationId,
    subscriptionStatus,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd,
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

function getInvoiceSubscriptionCreditPeriod(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  const subscriptionLine = invoice.lines?.data.find((line) => {
    const parent = line.parent;

    if (parent?.type !== 'subscription_item_details') {
      return false;
    }

    return (
      getStripeId(parent.subscription_item_details?.subscription ?? null) ===
        subscriptionId &&
      parent.subscription_item_details?.proration !== true &&
      isValidStripePeriod(line.period)
    );
  });

  if (subscriptionLine?.period) {
    return subscriptionLine.period;
  }

  if (
    isValidStripeTimestamp(invoice.period_start) &&
    isValidStripeTimestamp(invoice.period_end) &&
    invoice.period_end > invoice.period_start
  ) {
    return {
      start: invoice.period_start,
      end: invoice.period_end,
    };
  }

  throw new Error('Stripe invoice subscription period is required.');
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

function requiredDate(value: Date | null) {
  if (!value) {
    throw new Error('Stripe period date is required.');
  }

  return value;
}

function isRetainoMetadata(metadata: Stripe.Metadata | null | undefined) {
  return Boolean(
    optionalMetadata(metadata, 'organizationId') ||
      optionalMetadata(metadata, 'planKey') ||
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

function rolloverPeriodEnd(periodStart: Date, periodEnd: Date) {
  const rolloverEnd = new Date(periodEnd);
  const billingMonthSpan =
    (periodEnd.getUTCFullYear() - periodStart.getUTCFullYear()) * 12 +
    periodEnd.getUTCMonth() -
    periodStart.getUTCMonth();
  const monthsToAdd = Math.max(1, billingMonthSpan);
  const targetMonth = rolloverEnd.getUTCMonth() + monthsToAdd;
  const targetYear =
    rolloverEnd.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedTargetMonth = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(
    rolloverEnd.getUTCDate(),
    daysInUtcMonth(targetYear, normalizedTargetMonth),
  );

  rolloverEnd.setUTCFullYear(targetYear, normalizedTargetMonth, day);
  return rolloverEnd;
}

function daysInUtcMonth(year: number, zeroBasedMonth: number) {
  return new Date(Date.UTC(year, zeroBasedMonth + 1, 0)).getUTCDate();
}

async function syncSenderReleaseScheduleForSubscription(
  db: DbClient,
  input: {
    organizationId: string;
    subscriptionStatus: BillingSubscriptionStatus;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
  },
) {
  if (
    (input.subscriptionStatus === 'active' ||
      input.subscriptionStatus === 'trialing') &&
    input.cancelAtPeriodEnd &&
    input.currentPeriodEnd
  ) {
    await scheduleOrganizationSmsSenderRelease(db, {
      organizationId: input.organizationId,
      provider: 'twilio',
      status: 'ready',
      releaseScheduledAt: input.currentPeriodEnd,
    });
    return null;
  }

  if (
    input.subscriptionStatus === 'active' ||
    input.subscriptionStatus === 'trialing'
  ) {
    await clearOrganizationSmsSenderReleaseSchedule(db, {
      organizationId: input.organizationId,
      provider: 'twilio',
    });
    return null;
  }

  if (input.subscriptionStatus === 'past_due') {
    await scheduleOrganizationSmsSenderRelease(db, {
      organizationId: input.organizationId,
      provider: 'twilio',
      status: 'ready',
      releaseScheduledAt: smsSenderReleaseGraceDeadline(),
      preserveEarlierSchedule: true,
    });
    return null;
  }

  if (
    input.subscriptionStatus === 'canceled' ||
    input.subscriptionStatus === 'unpaid' ||
    input.subscriptionStatus === 'paused' ||
    input.subscriptionStatus === 'incomplete_expired'
  ) {
    await scheduleOrganizationSmsSenderRelease(db, {
      organizationId: input.organizationId,
      provider: 'twilio',
      status: 'release_pending',
      releaseScheduledAt: new Date(),
    });
    return input.organizationId;
  }

  return null;
}

function smsSenderReleaseGraceDeadline() {
  return new Date(
    Date.now() + SMS_SENDER_RELEASE_GRACE_DAYS * 24 * 60 * 60 * 1000,
  );
}

function isValidStripePeriod(
  value: Stripe.InvoiceLineItem.Period | null | undefined,
) {
  const start = value?.start;
  const end = value?.end;

  return (
    isValidStripeTimestamp(start) &&
    isValidStripeTimestamp(end) &&
    end > start
  );
}

function isValidStripeTimestamp(
  value: number | null | undefined,
): value is number {
  return typeof value === 'number' && value > 0;
}

function getStripeId(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function capitalizePlanKey(planKey: BillingPlanKey) {
  return `${planKey.charAt(0).toUpperCase()}${planKey.slice(1)}`;
}
