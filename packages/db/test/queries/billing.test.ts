import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  billingProfileToContract,
  createSmsCreditTransaction,
  getBillingWebhookEventByStripeEventId,
  getSmsCreditBalance,
  getSmsCreditBalanceBreakdown,
  getSmsCreditReservationState,
  recordBillingWebhookEvent,
  reserveSmsCreditsIfSufficient,
  smsCreditTransactionToContract,
  upsertOrganizationBillingProfile,
} from '../../src/queries/billing';

describe('billing query helpers', () => {
  it('maps billing profiles to billing status contracts', () => {
    expect(
      billingProfileToContract({
        id: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        stripePriceId: 'price_123',
        planKey: 'growth',
        subscriptionStatus: 'active',
        currentPeriodStart: new Date('2026-05-14T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-06-14T00:00:00.000Z'),
        cancelAtPeriodEnd: false,
        syncedAt: new Date('2026-05-14T00:00:00.000Z'),
        createdAt: new Date('2026-05-14T00:00:00.000Z'),
        updatedAt: new Date('2026-05-14T00:00:00.000Z'),
      }),
    ).toEqual({
      status: 'active',
      planKey: 'growth',
      currentPeriodEnd: '2026-06-14T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    });
  });

  it('maps missing billing profiles to an inactive subscription contract', () => {
    expect(billingProfileToContract(null)).toEqual({
      status: 'none',
      planKey: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  });

  it('maps SMS credit transactions to contracts', () => {
    expect(
      smsCreditTransactionToContract({
        id: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        transactionType: 'grant',
        credits: 1000,
        source: 'stripe_invoice',
        sourceId: 'in_123',
        creditBucket: 'subscription_period',
        periodStart: new Date('2026-05-14T00:00:00.000Z'),
        periodEnd: new Date('2026-06-14T00:00:00.000Z'),
        description: 'Growth monthly credits',
        createdAt: new Date('2026-05-14T00:00:00.000Z'),
      }),
    ).toMatchObject({
      transactionType: 'grant',
      source: 'stripe_invoice',
      creditBucket: 'subscription_period',
      credits: 1000,
      periodStart: '2026-05-14T00:00:00.000Z',
      periodEnd: '2026-06-14T00:00:00.000Z',
      createdAt: '2026-05-14T00:00:00.000Z',
    });
  });

  it('upserts billing profiles by organization id', async () => {
    let conflictTarget: unknown;
    let updateSet: unknown;
    const db = {
      insert: () => ({
        values: (values: unknown) => ({
          onConflictDoUpdate: (config: { target: unknown; set: unknown }) => {
            conflictTarget = config.target;
            updateSet = config.set;

            return {
              returning: () => [values],
            };
          },
        }),
      }),
    };

    await upsertOrganizationBillingProfile(db as never, {
      organizationId: '22222222-2222-4222-8222-222222222222',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      stripePriceId: 'price_123',
      planKey: 'growth',
      subscriptionStatus: 'active',
      currentPeriodStart: new Date('2026-05-14T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-14T00:00:00.000Z'),
      cancelAtPeriodEnd: false,
    });

    expect(conflictTarget).toBeDefined();
    expect(updateSet).toMatchObject({
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      stripePriceId: 'price_123',
      planKey: 'growth',
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: false,
    });
  });

  it('records webhook events idempotently by Stripe event id', async () => {
    let conflictTarget: unknown;
    const db = {
      insert: () => ({
        values: (values: unknown) => ({
          onConflictDoNothing: (config: { target: unknown }) => {
            conflictTarget = config.target;

            return {
              returning: () => [values],
            };
          },
        }),
      }),
    };

    const event = await recordBillingWebhookEvent(db as never, {
      stripeEventId: 'evt_123',
      eventType: 'checkout.session.completed',
      organizationId: '22222222-2222-4222-8222-222222222222',
      payload: { id: 'evt_123' },
    });

    expect(conflictTarget).toBeDefined();
    expect(event?.stripeEventId).toBe('evt_123');
  });

  it('reads webhook event processing state by Stripe event id', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              limit: () => [{ stripeEventId: 'evt_123', status: 'processed' }],
            };
          },
        }),
      }),
    };

    const event = await getBillingWebhookEventByStripeEventId(
      db as never,
      'evt_123',
    );

    expect(event?.status).toBe('processed');

    if (!whereCondition) {
      throw new Error('Expected webhook lookup to build a where condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"billing_webhook_events"."stripe_event_id"');
    expect(query.params).toEqual(['evt_123']);
  });

  it('creates credit transactions idempotently by source and bucket', async () => {
    let conflictTarget: unknown;
    const db = {
      insert: () => ({
        values: (values: unknown) => ({
          onConflictDoNothing: (config: { target: unknown }) => {
            conflictTarget = config.target;

            return {
              returning: () => [
                {
                  ...(values as object),
                  createdAt: new Date('2026-05-14T00:00:00.000Z'),
                },
              ],
            };
          },
        }),
      }),
    };

    const transaction = await createSmsCreditTransaction(db as never, {
      organizationId: '22222222-2222-4222-8222-222222222222',
      transactionType: 'grant',
      credits: 500,
      creditBucket: 'purchased',
      periodStart: null,
      periodEnd: null,
      source: 'stripe_checkout_session',
      sourceId: 'cs_123',
      description: '500 credits purchase',
    });

    expect(conflictTarget).toBeDefined();
    expect(transaction).toMatchObject({
      transactionType: 'grant',
      credits: 500,
      creditBucket: 'purchased',
      source: 'stripe_checkout_session',
      sourceId: 'cs_123',
    });
  });

  it('reads SMS credit balance from spendable ledger rows', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              groupBy: () => [
                { creditBucket: 'purchased', balance: 500 },
                { creditBucket: 'subscription_period', balance: 300 },
              ],
            };
          },
        }),
      }),
    };

    const balance = await getSmsCreditBalance(
      db as never,
      '22222222-2222-4222-8222-222222222222',
    );

    expect(balance).toBe(800);

    if (!whereCondition) {
      throw new Error('Expected getSmsCreditBalance to build a where condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"sms_credit_transactions"."organization_id"');
    expect(query.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
      'purchased',
      'subscription_period',
    ]);
  });

  it('reserves credits with a row-locked ledger allocation', async () => {
    let statement: SQL | undefined;
    const tx = {
      execute: (query: SQL) => {
        statement = query;

        return {
          rows: [
            {
              transaction_type: 'debit',
              credits: -1,
              source: 'campaign_test_send',
              source_id: 'campaign-test-123',
              credit_bucket: 'subscription_period',
              period_start: '2026-05-14T00:00:00.000Z',
              period_end: '2026-06-14T00:00:00.000Z',
              description: 'Campaign test SMS usage',
              created_at: '2026-05-14T00:00:00.000Z',
            },
          ],
        };
      },
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    const result = await reserveSmsCreditsIfSufficient(db as never, {
      organizationId: '22222222-2222-4222-8222-222222222222',
      credits: 1,
      source: 'campaign_test_send',
      sourceId: 'campaign-test-123',
      description: 'Campaign test SMS usage',
    });

    expect(result.debitedCredits).toBe(1);
    expect(result.transactions).toEqual([
      {
        transactionType: 'debit',
        credits: -1,
        source: 'campaign_test_send',
        sourceId: 'campaign-test-123',
        creditBucket: 'subscription_period',
        periodStart: '2026-05-14T00:00:00.000Z',
        periodEnd: '2026-06-14T00:00:00.000Z',
        description: 'Campaign test SMS usage',
        createdAt: '2026-05-14T00:00:00.000Z',
      },
    ]);

    if (!statement) {
      throw new Error('Expected atomic debit to execute a SQL statement.');
    }

    const query = new PgDialect().sqlToQuery(statement);

    expect(query.sql).toContain(
      '(balances.subscription_period + balances.purchased) >=',
    );
    expect(query.sql).toContain('from "organization_billing_profiles"');
    expect(query.sql).toContain('for update');
    expect(query.sql).not.toContain('pg_advisory_xact_lock');
    expect(query.sql).toContain('insert into "sms_credit_transactions"');
  });

  it('returns existing reservation rows for idempotent source IDs', async () => {
    let statement: SQL | undefined;
    const tx = {
      execute: (query: SQL) => {
        statement = query;

        return { rows: [] };
      },
      select: () => ({
        from: () => ({
          where: () => [
            {
              id: '11111111-1111-4111-8111-111111111111',
              organizationId: '22222222-2222-4222-8222-222222222222',
              transactionType: 'debit',
              credits: -3,
              source: 'campaign_send',
              sourceId: 'campaign-send-123',
              creditBucket: 'subscription_period',
              periodStart: new Date('2026-05-14T00:00:00.000Z'),
              periodEnd: new Date('2026-06-14T00:00:00.000Z'),
              description: 'Campaign SMS reservation',
              createdAt: new Date('2026-05-14T00:00:00.000Z'),
              updatedAt: new Date('2026-05-14T00:00:00.000Z'),
            },
          ],
        }),
      }),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    const result = await reserveSmsCreditsIfSufficient(db as never, {
      organizationId: '22222222-2222-4222-8222-222222222222',
      credits: 3,
      source: 'campaign_send',
      sourceId: 'campaign-send-123',
      description: 'Campaign SMS reservation',
    });

    expect(statement).toBeDefined();
    expect(result).toEqual({
      debitedCredits: 3,
      transactions: [
        {
          transactionType: 'debit',
          credits: -3,
          source: 'campaign_send',
          sourceId: 'campaign-send-123',
          creditBucket: 'subscription_period',
          periodStart: '2026-05-14T00:00:00.000Z',
          periodEnd: '2026-06-14T00:00:00.000Z',
          description: 'Campaign SMS reservation',
          createdAt: '2026-05-14T00:00:00.000Z',
        },
      ],
    });
  });

  it('reads active SMS credit reservation state by source prefix', async () => {
    let statement: SQL | undefined;
    const db = {
      execute: (query: SQL) => {
        statement = query;

        return {
          rows: [
            {
              active_source_id: 'campaign-send-123:retry',
              has_history: true,
            },
          ],
        };
      },
    };

    await expect(
      getSmsCreditReservationState(db as never, {
        organizationId: '22222222-2222-4222-8222-222222222222',
        source: 'campaign_send',
        sourceId: 'campaign-send-123',
      }),
    ).resolves.toEqual({
      activeSourceId: 'campaign-send-123:retry',
      hasHistory: true,
    });

    if (!statement) {
      throw new Error('Expected reservation state to execute a SQL statement.');
    }

    const query = new PgDialect().sqlToQuery(statement);

    expect(query.sql).toContain('active_reservations');
    expect(query.sql).toContain('regexp_replace');
    expect(query.params).toEqual(
      expect.arrayContaining([
        '22222222-2222-4222-8222-222222222222',
        'campaign_send',
        'campaign-send-123',
        'campaign-send-123:%',
      ]),
    );
  });

  it('returns SMS credit balance breakdown by purchased and current period credits', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            groupBy: () => [
              { creditBucket: 'purchased', balance: 500 },
              { creditBucket: 'subscription_period', balance: 300 },
            ],
          }),
        }),
      }),
    };

    await expect(
      getSmsCreditBalanceBreakdown(
        db as never,
        '22222222-2222-4222-8222-222222222222',
      ),
    ).resolves.toEqual({
      purchased: 500,
      subscriptionPeriod: 300,
      total: 800,
    });
  });

});
