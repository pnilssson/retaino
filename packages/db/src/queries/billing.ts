import { eq, sql } from 'drizzle-orm';
import type {
  BillingPlanKey,
  BillingSubscription,
  BillingSubscriptionStatus,
  SmsCreditTransaction,
  SmsCreditTransactionSource,
  SmsCreditTransactionType,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import {
  billingWebhookEvents,
  organizationBillingProfiles,
  smsCreditTransactions,
} from '../schema';
import { assertOrganizationId } from './contacts';

type OrganizationBillingProfileRow =
  typeof organizationBillingProfiles.$inferSelect;
type SmsCreditTransactionRow = typeof smsCreditTransactions.$inferSelect;

export type UpsertOrganizationBillingProfileInput = {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  planKey: BillingPlanKey | null;
  subscriptionStatus: BillingSubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export type RecordBillingWebhookEventInput = {
  stripeEventId: string;
  eventType: string;
  organizationId: string | null;
  payload: unknown;
};

export type CreateSmsCreditTransactionInput = {
  organizationId: string;
  transactionType: SmsCreditTransactionType;
  credits: number;
  source: SmsCreditTransactionSource;
  sourceId: string;
  description: string;
};

export function billingProfileToContract(
  row: OrganizationBillingProfileRow | null,
): BillingSubscription {
  if (!row) {
    return {
      status: 'none',
      planKey: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  return {
    status: row.subscriptionStatus as BillingSubscriptionStatus,
    planKey: row.planKey as BillingPlanKey | null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  };
}

export function smsCreditTransactionToContract(
  row: SmsCreditTransactionRow,
): SmsCreditTransaction {
  return {
    transactionType: row.transactionType as SmsCreditTransactionType,
    source: row.source as SmsCreditTransactionSource,
    sourceId: row.sourceId,
    credits: row.credits,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function upsertOrganizationBillingProfile(
  db: DbClient,
  input: UpsertOrganizationBillingProfileInput,
) {
  assertOrganizationId(input.organizationId);

  const now = new Date();
  const [row] = await db
    .insert(organizationBillingProfiles)
    .values({
      ...input,
      syncedAt: now,
    })
    .onConflictDoUpdate({
      target: organizationBillingProfiles.organizationId,
      set: {
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        stripePriceId: input.stripePriceId,
        planKey: input.planKey,
        subscriptionStatus: input.subscriptionStatus,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        syncedAt: now,
        updatedAt: now,
      },
    })
    .returning();

  return row ?? null;
}

export async function getOrganizationBillingProfile(
  db: DbClient,
  organizationId: string,
) {
  assertOrganizationId(organizationId);

  const [row] = await db
    .select()
    .from(organizationBillingProfiles)
    .where(eq(organizationBillingProfiles.organizationId, organizationId))
    .limit(1);

  return row ?? null;
}

export async function recordBillingWebhookEvent(
  db: DbClient,
  input: RecordBillingWebhookEventInput,
) {
  const [row] = await db
    .insert(billingWebhookEvents)
    .values(input)
    .onConflictDoNothing({
      target: billingWebhookEvents.stripeEventId,
    })
    .returning();

  return row ?? null;
}

export async function markBillingWebhookEventProcessed(
  db: DbClient,
  stripeEventId: string,
) {
  const [row] = await db
    .update(billingWebhookEvents)
    .set({
      status: 'processed',
      processedAt: new Date(),
    })
    .where(eq(billingWebhookEvents.stripeEventId, stripeEventId))
    .returning();

  return row ?? null;
}

export async function createSmsCreditTransaction(
  db: DbClient,
  input: CreateSmsCreditTransactionInput,
) {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .insert(smsCreditTransactions)
    .values(input)
    .onConflictDoNothing({
      target: [
        smsCreditTransactions.source,
        smsCreditTransactions.sourceId,
      ],
    })
    .returning();

  return row ? smsCreditTransactionToContract(row) : null;
}

export async function getSmsCreditBalance(
  db: DbClient,
  organizationId: string,
) {
  assertOrganizationId(organizationId);

  const [row] = await db
    .select({
      balance: sql<number>`coalesce(sum(${smsCreditTransactions.credits}), 0)`,
    })
    .from(smsCreditTransactions)
    .where(eq(smsCreditTransactions.organizationId, organizationId));

  return Number(row?.balance ?? 0);
}
