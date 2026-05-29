import { and, eq, gt, inArray, lt, lte, or, sql } from 'drizzle-orm';
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
type RawSmsCreditTransactionRow = {
  transaction_type: string;
  credits: number;
  source: string;
  source_id: string;
  period_start: Date | string | null;
  period_end: Date | string | null;
  description: string;
  created_at: Date | string;
};
const BILLING_WEBHOOK_PROCESSING_STALE_AFTER_MINUTES = 5;

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

export type BillingWebhookEventProcessingClaim =
  | { claimStatus: 'claimed' }
  | { claimStatus: 'processed' }
  | { claimStatus: 'processing' };

export type CreateSmsCreditTransactionInput = {
  organizationId: string;
  transactionType: SmsCreditTransactionType;
  credits: number;
  source: SmsCreditTransactionSource;
  sourceId: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  description: string;
};

export type ReserveSmsCreditsIfSufficientInput = {
  organizationId: string;
  credits: number;
  source: Extract<
    SmsCreditTransactionSource,
    'campaign_send' | 'campaign_test_send' | 'manual_reply'
  >;
  sourceId: string;
  description: string;
};

export type SmsCreditReservationStateInput = {
  organizationId: string;
  source: Extract<SmsCreditTransactionSource, 'campaign_send'>;
  sourceId: string;
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
    periodStart: row.periodStart?.toISOString() ?? null,
    periodEnd: row.periodEnd?.toISOString() ?? null,
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

export async function claimBillingWebhookEventProcessing(
  db: DbClient,
  input: RecordBillingWebhookEventInput,
) {
  const now = new Date();
  const [row] = await db
    .insert(billingWebhookEvents)
    .values({
      ...input,
      status: 'processing',
      receivedAt: now,
      processedAt: null,
    })
    .onConflictDoNothing({
      target: billingWebhookEvents.stripeEventId,
    })
    .returning();

  if (row) {
    return { claimStatus: 'claimed' } satisfies BillingWebhookEventProcessingClaim;
  }

  const [retryRow] = await db
    .update(billingWebhookEvents)
    .set({
      eventType: input.eventType,
      organizationId: input.organizationId,
      payload: input.payload,
      status: 'processing',
      receivedAt: now,
      processedAt: null,
    })
    .where(
      and(
        eq(billingWebhookEvents.stripeEventId, input.stripeEventId),
        or(
          inArray(billingWebhookEvents.status, ['received', 'failed']),
          and(
            eq(billingWebhookEvents.status, 'processing'),
            lt(
              billingWebhookEvents.receivedAt,
              sql`now() - (${BILLING_WEBHOOK_PROCESSING_STALE_AFTER_MINUTES} * interval '1 minute')`,
            ),
          ),
        ),
      ),
    )
    .returning();

  if (retryRow) {
    return { claimStatus: 'claimed' } satisfies BillingWebhookEventProcessingClaim;
  }

  const [existing] = await db
    .select({ status: billingWebhookEvents.status })
    .from(billingWebhookEvents)
    .where(eq(billingWebhookEvents.stripeEventId, input.stripeEventId))
    .limit(1);

  if (existing?.status === 'processed') {
    return { claimStatus: 'processed' } satisfies BillingWebhookEventProcessingClaim;
  }

  return { claimStatus: 'processing' } satisfies BillingWebhookEventProcessingClaim;
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

export async function markBillingWebhookEventFailed(
  db: DbClient,
  stripeEventId: string,
) {
  const [row] = await db
    .update(billingWebhookEvents)
    .set({
      status: 'failed',
      processedAt: null,
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
        smsCreditTransactions.organizationId,
        smsCreditTransactions.source,
        smsCreditTransactions.sourceId,
        smsCreditTransactions.periodStart,
        smsCreditTransactions.periodEnd,
      ],
    })
    .returning();

  return row ? smsCreditTransactionToContract(row) : null;
}

export async function reserveSmsCreditsIfSufficient(
  db: DbClient,
  input: ReserveSmsCreditsIfSufficientInput,
) {
  assertOrganizationId(input.organizationId);

  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      with active_profile as (
        select
          ${organizationBillingProfiles.organizationId} as organization_id,
          ${organizationBillingProfiles.currentPeriodStart} as current_period_start,
          ${organizationBillingProfiles.currentPeriodEnd} as current_period_end
        from ${organizationBillingProfiles}
        where ${organizationBillingProfiles.organizationId} = ${input.organizationId}
          and ${organizationBillingProfiles.subscriptionStatus} = ${'active'}
        for update
      ),
      grant_balances as (
        select
          ${smsCreditTransactions.periodStart} as period_start,
          ${smsCreditTransactions.periodEnd} as period_end,
          sum(${smsCreditTransactions.credits})::integer as balance
        from active_profile
        join ${smsCreditTransactions}
          on ${smsCreditTransactions.organizationId} = active_profile.organization_id
        where ${smsCreditTransactions.periodStart} <= now()
          and ${smsCreditTransactions.periodEnd} > now()
        group by ${smsCreditTransactions.periodStart}, ${smsCreditTransactions.periodEnd}
        having sum(${smsCreditTransactions.credits}) > 0
      ),
      ordered_balances as (
        select
          grant_balances.period_start,
          grant_balances.period_end,
          grant_balances.balance,
          coalesce(
            sum(grant_balances.balance) over (
              order by grant_balances.period_end, grant_balances.period_start
              rows between unbounded preceding and 1 preceding
            ),
            0
          )::integer as previous_balance,
          sum(grant_balances.balance) over ()::integer as total_balance
        from grant_balances
      ),
      allocation as (
        select
          ordered_balances.period_start,
          ordered_balances.period_end,
          least(
            ordered_balances.balance,
            ${input.credits} - ordered_balances.previous_balance
          )::integer as debit
        from ordered_balances
        where ordered_balances.total_balance >= ${input.credits}
          and ordered_balances.previous_balance < ${input.credits}
          and not exists (
            select 1
            from ${smsCreditTransactions}
            where ${smsCreditTransactions.source} = ${input.source}
              and ${smsCreditTransactions.sourceId} = ${input.sourceId}
          )
      ),
      inserted as (
        insert into ${smsCreditTransactions} (
          organization_id,
          transaction_type,
          credits,
          source,
          source_id,
          period_start,
          period_end,
          description
        )
        select
          ${input.organizationId},
          ${'debit'},
          -allocation.debit,
          ${input.source},
          ${input.sourceId},
          allocation.period_start,
          allocation.period_end,
          ${input.description}
        from allocation
        where allocation.debit > 0
        on conflict do nothing
        returning
          transaction_type,
          credits,
          source,
          source_id,
          period_start,
          period_end,
          description,
          created_at
      )
      select * from inserted
    `);
    const rows = Array.from(result.rows ?? []) as RawSmsCreditTransactionRow[];
    const debitedCredits = rows.reduce((total, row) => {
      return total + Math.abs(row.credits);
    }, 0);

    if (debitedCredits === 0) {
      const existingRows = await tx
        .select()
        .from(smsCreditTransactions)
        .where(
          and(
            eq(smsCreditTransactions.organizationId, input.organizationId),
            eq(smsCreditTransactions.source, input.source),
            eq(smsCreditTransactions.sourceId, input.sourceId),
          ),
        );
      const existingDebitedCredits = existingRows.reduce((total, row) => {
        return total + (row.credits < 0 ? Math.abs(row.credits) : 0);
      }, 0);

      if (existingDebitedCredits > 0) {
        return {
          debitedCredits: existingDebitedCredits,
          transactions: existingRows.map(smsCreditTransactionToContract),
        };
      }
    }

    return {
      debitedCredits,
      transactions: rows.map(rawSmsCreditTransactionToContract),
    };
  });
}

export async function getSmsCreditReservationState(
  db: DbClient,
  input: SmsCreditReservationStateInput,
) {
  assertOrganizationId(input.organizationId);

  const result = await db.execute(sql`
    with matching_transactions as (
      select
        ${smsCreditTransactions.sourceId} as source_id,
        ${smsCreditTransactions.credits} as credits
      from ${smsCreditTransactions}
      where ${smsCreditTransactions.organizationId} = ${input.organizationId}
        and ${smsCreditTransactions.source} = ${input.source}
        and (
          ${smsCreditTransactions.sourceId} = ${input.sourceId}
          or ${smsCreditTransactions.sourceId} like ${`${input.sourceId}:%`}
        )
    ),
    debits as (
      select
        source_id,
        sum(abs(credits))::integer as debited_credits
      from matching_transactions
      where credits < 0
        and source_id not like ${'%:release'}
      group by source_id
    ),
    releases as (
      select
        regexp_replace(source_id, ':release$', '') as source_id,
        sum(credits)::integer as released_credits
      from matching_transactions
      where credits > 0
        and source_id like ${'%:release'}
      group by regexp_replace(source_id, ':release$', '')
    ),
    active_reservations as (
      select debits.source_id
      from debits
      left join releases on releases.source_id = debits.source_id
      where debits.debited_credits > coalesce(releases.released_credits, 0)
      order by debits.source_id
      limit 1
    )
    select
      (select source_id from active_reservations) as active_source_id,
      exists(select 1 from matching_transactions) as has_history
  `);
  const [row = {}] = Array.from(result.rows ?? []) as Array<
    Record<string, unknown>
  >;

  return {
    activeSourceId:
      typeof row.active_source_id === 'string' ? row.active_source_id : null,
    hasHistory: row.has_history === true,
  };
}

function rawSmsCreditTransactionToContract(row: RawSmsCreditTransactionRow) {
  return {
    transactionType: row.transaction_type as SmsCreditTransactionType,
    source: row.source as SmsCreditTransactionSource,
    sourceId: row.source_id,
    credits: row.credits,
    periodStart: rawTimestampToIso(row.period_start),
    periodEnd: rawTimestampToIso(row.period_end),
    description: row.description,
    createdAt: rawTimestampToIso(row.created_at),
  };
}

function rawTimestampToIso(value: Date | string): string;
function rawTimestampToIso(value: Date | string | null): string | null;
function rawTimestampToIso(value: Date | string | null) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
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
    .where(getSpendableCreditCondition(organizationId));

  return Number(row?.balance ?? 0);
}

function getSpendableCreditCondition(organizationId: string) {
  return and(
    eq(smsCreditTransactions.organizationId, organizationId),
    lte(smsCreditTransactions.periodStart, sql`now()`),
    gt(smsCreditTransactions.periodEnd, sql`now()`),
  );
}
