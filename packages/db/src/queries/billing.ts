import { and, eq, gt, lte, or, sql } from 'drizzle-orm';
import type {
  BillingPlanKey,
  BillingSubscription,
  BillingSubscriptionStatus,
  SmsCreditBucket,
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
  credit_bucket: string;
  period_start: Date | string | null;
  period_end: Date | string | null;
  description: string;
  created_at: Date | string;
};

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
  creditBucket: SmsCreditBucket;
  periodStart: Date | null;
  periodEnd: Date | null;
  description: string;
};

export type ReserveSmsCreditsIfSufficientInput = {
  organizationId: string;
  credits: number;
  source: Extract<
    SmsCreditTransactionSource,
    'campaign_send' | 'campaign_test_send'
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
    creditBucket: row.creditBucket as SmsCreditBucket,
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

export async function getBillingWebhookEventByStripeEventId(
  db: DbClient,
  stripeEventId: string,
) {
  const [row] = await db
    .select()
    .from(billingWebhookEvents)
    .where(eq(billingWebhookEvents.stripeEventId, stripeEventId))
    .limit(1);

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
        smsCreditTransactions.creditBucket,
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
      balances as (
        select
          active_profile.organization_id,
          active_profile.current_period_start,
          active_profile.current_period_end,
          coalesce(
            sum(${smsCreditTransactions.credits}) filter (
              where ${smsCreditTransactions.creditBucket} = ${'subscription_period'}
                and ${smsCreditTransactions.periodStart} <= now()
                and ${smsCreditTransactions.periodEnd} > now()
            ),
            0
          )::integer as subscription_period,
          coalesce(
            sum(${smsCreditTransactions.credits}) filter (
              where ${smsCreditTransactions.creditBucket} = ${'purchased'}
            ),
            0
          )::integer as purchased
        from active_profile
        left join ${smsCreditTransactions}
          on ${smsCreditTransactions.organizationId} = active_profile.organization_id
        group by
          active_profile.organization_id,
          active_profile.current_period_start,
          active_profile.current_period_end
      ),
      allocation as (
        select
          balances.organization_id,
          balances.current_period_start,
          balances.current_period_end,
          (balances.subscription_period + balances.purchased)::integer as total,
          least(${input.credits}, greatest(balances.subscription_period, 0))::integer
            as subscription_debit,
          (
            ${input.credits} -
            least(${input.credits}, greatest(balances.subscription_period, 0))
          )::integer as purchased_debit
        from balances
        where (balances.subscription_period + balances.purchased) >= ${input.credits}
          and not exists (
            select 1
            from ${smsCreditTransactions}
            where ${smsCreditTransactions.source} = ${input.source}
              and ${smsCreditTransactions.sourceId} = ${input.sourceId}
          )
      ),
      inserted_subscription as (
        insert into ${smsCreditTransactions} (
          organization_id,
          transaction_type,
          credits,
          source,
          source_id,
          credit_bucket,
          period_start,
          period_end,
          description
        )
        select
          ${input.organizationId},
          ${'debit'},
          -allocation.subscription_debit,
          ${input.source},
          ${input.sourceId},
          ${'subscription_period'},
          allocation.current_period_start,
          allocation.current_period_end,
          ${input.description}
        from allocation
        where allocation.subscription_debit > 0
          and allocation.current_period_start is not null
          and allocation.current_period_end is not null
        on conflict do nothing
        returning
          transaction_type,
          credits,
          source,
          source_id,
          credit_bucket,
          period_start,
          period_end,
          description,
          created_at
      ),
      inserted_purchased as (
        insert into ${smsCreditTransactions} (
          organization_id,
          transaction_type,
          credits,
          source,
          source_id,
          credit_bucket,
          period_start,
          period_end,
          description
        )
        select
          ${input.organizationId},
          ${'debit'},
          -allocation.purchased_debit,
          ${input.source},
          ${input.sourceId},
          ${'purchased'},
          null,
          null,
          ${input.description}
        from allocation
        where allocation.purchased_debit > 0
        on conflict do nothing
        returning
          transaction_type,
          credits,
          source,
          source_id,
          credit_bucket,
          period_start,
          period_end,
          description,
          created_at
      )
      select * from inserted_subscription
      union all
      select * from inserted_purchased
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
    creditBucket: row.credit_bucket as SmsCreditBucket,
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
  const balance = await getSmsCreditBalanceBreakdown(db, organizationId);
  return balance.total;
}

export async function getSmsCreditBalanceBreakdown(
  db: DbClient,
  organizationId: string,
) {
  assertOrganizationId(organizationId);

  const rows = await db
    .select({
      creditBucket: smsCreditTransactions.creditBucket,
      balance: sql<number>`coalesce(sum(${smsCreditTransactions.credits}), 0)`,
    })
    .from(smsCreditTransactions)
    .where(getSpendableCreditCondition(organizationId))
    .groupBy(smsCreditTransactions.creditBucket);

  const purchased = Number(
    rows.find((row) => row.creditBucket === 'purchased')?.balance ?? 0,
  );
  const subscriptionPeriod = Number(
    rows.find((row) => row.creditBucket === 'subscription_period')?.balance ??
      0,
  );

  return {
    purchased,
    subscriptionPeriod,
    total: purchased + subscriptionPeriod,
  };
}

function getSpendableCreditCondition(organizationId: string) {
  return and(
    eq(smsCreditTransactions.organizationId, organizationId),
    or(
      eq(smsCreditTransactions.creditBucket, 'purchased'),
      and(
        eq(smsCreditTransactions.creditBucket, 'subscription_period'),
        lte(smsCreditTransactions.periodStart, sql`now()`),
        gt(smsCreditTransactions.periodEnd, sql`now()`),
      ),
    ),
  );
}
