import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  billingProfileToContract,
  createSmsCreditTransaction,
  getSmsCreditBalance,
  recordBillingWebhookEvent,
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
        description: 'Growth monthly credits',
        createdAt: new Date('2026-05-14T00:00:00.000Z'),
      }),
    ).toMatchObject({
      transactionType: 'grant',
      source: 'stripe_invoice',
      credits: 1000,
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

  it('creates credit transactions idempotently by source and source id', async () => {
    let insertedValues: unknown;
    let conflictTarget: unknown;
    const db = {
      insert: () => ({
        values: (values: unknown) => {
          insertedValues = values;

          return {
            onConflictDoNothing: (config: { target: unknown }) => {
              conflictTarget = config.target;

              return {
                returning: () => [
                  {
                    ...(values as Record<string, unknown>),
                    id: '11111111-1111-4111-8111-111111111111',
                    createdAt: new Date('2026-05-14T00:00:00.000Z'),
                  },
                ],
              };
            },
          };
        },
      }),
    };

    await createSmsCreditTransaction(db as never, {
      organizationId: '22222222-2222-4222-8222-222222222222',
      transactionType: 'debit',
      credits: -12,
      source: 'campaign_send',
      sourceId: 'campaign-send-123',
      description: 'Campaign send usage',
    });

    expect(insertedValues).toMatchObject({
      organizationId: '22222222-2222-4222-8222-222222222222',
      transactionType: 'debit',
      credits: -12,
      source: 'campaign_send',
      sourceId: 'campaign-send-123',
    });
    expect(conflictTarget).toBeDefined();
  });

  it('reads SMS credit balance from transaction sums for one organization', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return [{ balance: 988 }];
          },
        }),
      }),
    };

    const balance = await getSmsCreditBalance(
      db as never,
      '22222222-2222-4222-8222-222222222222',
    );

    expect(balance).toBe(988);

    if (!whereCondition) {
      throw new Error('Expected getSmsCreditBalance to build a where condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"sms_credit_transactions"."organization_id"');
    expect(query.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
    ]);
  });
});
