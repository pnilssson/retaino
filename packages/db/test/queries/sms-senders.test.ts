import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  clearOrganizationSmsSenderReleaseSchedule,
  getOrganizationSmsSender,
  getOrganizationSmsSenderByProviderReference,
  listOrganizationSmsSendersDueForRelease,
  markOrganizationSmsSenderReleaseFailed,
  markOrganizationSmsSenderReleased,
  organizationSmsSenderToContract,
  scheduleOrganizationSmsSenderRelease,
  upsertOrganizationSmsSender,
} from '../../src/queries/sms-senders';

const senderRow = {
  id: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  provider: 'twilio',
  status: 'ready',
  phoneNumber: '+46700000000',
  countryCode: 'SE',
  numberType: 'mobile',
  providerMessagingServiceId: 'MG123',
  providerPhoneNumberId: 'PN123',
  regulatoryStatus: 'ready',
  failureReason: null,
  provisionedAt: new Date('2026-05-18T00:00:00.000Z'),
  lastVerifiedAt: new Date('2026-05-18T00:01:00.000Z'),
  releaseScheduledAt: null,
  releasedAt: null,
  createdAt: new Date('2026-05-18T00:00:00.000Z'),
  updatedAt: new Date('2026-05-18T00:01:00.000Z'),
};

function sqlExpression(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected SQL expression.');
  }

  return new PgDialect().sqlToQuery(sql`select ${value as SQL}`);
}

describe('organization SMS sender query helpers', () => {
  it('maps sender rows to shared contract shapes', () => {
    expect(organizationSmsSenderToContract(senderRow)).toEqual({
      ...senderRow,
      provider: 'twilio',
      status: 'ready',
      provisionedAt: '2026-05-18T00:00:00.000Z',
      lastVerifiedAt: '2026-05-18T00:01:00.000Z',
      releaseScheduledAt: null,
      releasedAt: null,
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:01:00.000Z',
    });
  });

  it('maps release lifecycle timestamps', () => {
    expect(
      organizationSmsSenderToContract({
        ...senderRow,
        status: 'release_pending',
        releaseScheduledAt: new Date('2026-06-18T00:00:00.000Z'),
        releasedAt: null,
      }),
    ).toMatchObject({
      status: 'release_pending',
      releaseScheduledAt: '2026-06-18T00:00:00.000Z',
      releasedAt: null,
    });

    expect(
      organizationSmsSenderToContract({
        ...senderRow,
        status: 'released',
        phoneNumber: null,
        providerMessagingServiceId: null,
        providerPhoneNumberId: null,
        releaseScheduledAt: new Date('2026-06-18T00:00:00.000Z'),
        releasedAt: new Date('2026-06-18T00:00:30.000Z'),
      }),
    ).toMatchObject({
      status: 'released',
      phoneNumber: null,
      providerMessagingServiceId: null,
      providerPhoneNumberId: null,
      releaseScheduledAt: '2026-06-18T00:00:00.000Z',
      releasedAt: '2026-06-18T00:00:30.000Z',
    });
  });

  it('loads a sender with organization and provider filters', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              limit: () => [senderRow],
            };
          },
        }),
      }),
    };

    await getOrganizationSmsSender(db as never, {
      organizationId: senderRow.organizationId,
      provider: 'twilio',
    });

    if (!whereCondition) {
      throw new Error('Expected getOrganizationSmsSender to build a condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain(
      '"organization_sms_senders"."organization_id" = $1',
    );
    expect(query.sql).toContain('"organization_sms_senders"."provider" = $2');
    expect(query.params).toEqual([senderRow.organizationId, 'twilio']);
  });

  it('resolves a sender from provider callback references', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              limit: () => [senderRow],
            };
          },
        }),
      }),
    };

    await getOrganizationSmsSenderByProviderReference(db as never, {
      provider: 'twilio',
      providerMessagingServiceId: senderRow.providerMessagingServiceId,
      providerPhoneNumberId: null,
      phoneNumber: senderRow.phoneNumber,
    });

    if (!whereCondition) {
      throw new Error(
        'Expected getOrganizationSmsSenderByProviderReference to build a condition.',
      );
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"organization_sms_senders"."provider" = $1');
    expect(query.sql).toContain(
      '"organization_sms_senders"."provider_messaging_service_id" = $2',
    );
    expect(query.sql).toContain('"organization_sms_senders"."phone_number" = $3');
    expect(query.sql.toLowerCase()).not.toContain(' or ');
    expect(query.params).toEqual([
      'twilio',
      senderRow.providerMessagingServiceId,
      senderRow.phoneNumber,
    ]);
  });

  it('upserts one provider sender per organization', async () => {
    let conflictTarget: unknown;
    const db = {
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: (input: { target: unknown }) => {
            conflictTarget = input.target;

            return {
              returning: () => [senderRow],
            };
          },
        }),
      }),
    };

    await upsertOrganizationSmsSender(db as never, {
      organizationId: senderRow.organizationId,
      provider: 'twilio',
      status: 'ready',
      phoneNumber: senderRow.phoneNumber,
      countryCode: senderRow.countryCode,
      numberType: 'mobile',
      providerMessagingServiceId: senderRow.providerMessagingServiceId,
      providerPhoneNumberId: senderRow.providerPhoneNumberId,
      regulatoryStatus: senderRow.regulatoryStatus,
      failureReason: null,
      provisionedAt: senderRow.provisionedAt,
      lastVerifiedAt: senderRow.lastVerifiedAt,
      releaseScheduledAt: null,
      releasedAt: null,
    });

    expect(conflictTarget).toHaveLength(2);
  });

  it('schedules a sender release for an organization provider', async () => {
    let updateSet: Record<string, unknown> | undefined;
    let whereCondition: SQL | undefined;
    const db = {
      update: () => ({
        set: (set: Record<string, unknown>) => {
          updateSet = set;

          return {
            where: (condition: SQL | undefined) => {
              whereCondition = condition;

              return {
                returning: () => [
                  {
                    ...senderRow,
                    ...set,
                    status: 'release_pending',
                  },
                ],
              };
            },
          };
        },
      }),
    };

    await scheduleOrganizationSmsSenderRelease(db as never, {
      organizationId: senderRow.organizationId,
      provider: 'twilio',
      status: 'release_pending',
      releaseScheduledAt: new Date('2026-06-18T00:00:00.000Z'),
    });

    expect(updateSet).toMatchObject({
      releaseScheduledAt: new Date('2026-06-18T00:00:00.000Z'),
      releasedAt: null,
    });
    const statusQuery = sqlExpression(updateSet?.status);
    expect(statusQuery.sql).toContain(
      'case when "organization_sms_senders"."status" in',
    );
    expect(statusQuery.params).toEqual(['release_pending']);

    if (!whereCondition) {
      throw new Error('Expected release scheduling to build a condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain(
      '"organization_sms_senders"."organization_id" = $1',
    );
    expect(query.sql).toContain('"organization_sms_senders"."provider" = $2');
    expect(query.params).toEqual([
      senderRow.organizationId,
      'twilio',
      'released',
    ]);
  });

  it('can preserve an earlier pending release schedule', async () => {
    let updateSet: Record<string, unknown> | undefined;
    const db = {
      update: () => ({
        set: (set: Record<string, unknown>) => {
          updateSet = set;

          return {
            where: () => ({
              returning: () => [
                {
                  ...senderRow,
                  ...set,
                  status: 'ready',
                  releaseScheduledAt: new Date('2026-06-18T00:00:00.000Z'),
                },
              ],
            }),
          };
        },
      }),
    };

    await scheduleOrganizationSmsSenderRelease(db as never, {
      organizationId: senderRow.organizationId,
      provider: 'twilio',
      status: 'ready',
      releaseScheduledAt: new Date('2026-06-18T00:00:00.000Z'),
      preserveEarlierSchedule: true,
    });

    const query = sqlExpression(updateSet?.releaseScheduledAt);

    expect(query.sql).toContain('least(coalesce(');
    expect(query.params).toEqual([
      new Date('2026-06-18T00:00:00.000Z'),
      new Date('2026-06-18T00:00:00.000Z'),
    ]);
  });

  it('clears a pending release schedule after payment recovery', async () => {
    let updateSet: Record<string, unknown> | undefined;
    const db = {
      update: () => ({
        set: (set: Record<string, unknown>) => {
          updateSet = set;

          return {
            where: () => ({
              returning: () => [{ ...senderRow, ...set, status: 'ready' }],
            }),
          };
        },
      }),
    };

    await clearOrganizationSmsSenderReleaseSchedule(db as never, {
      organizationId: senderRow.organizationId,
      provider: 'twilio',
    });

    expect(updateSet).toMatchObject({
      releaseScheduledAt: null,
      releasedAt: null,
    });
    expect(sqlExpression(updateSet?.status).sql).toContain(
      "then 'ready' else",
    );
    expect(sqlExpression(updateSet?.failureReason).sql).toContain(
      "then null else",
    );
  });

  it('lists senders due for release by schedule and provider references', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              orderBy: () => ({
                limit: () => [senderRow],
              }),
            };
          },
        }),
      }),
    };

    await listOrganizationSmsSendersDueForRelease(db as never, {
      now: new Date('2026-06-18T00:00:00.000Z'),
      limit: 25,
    });

    if (!whereCondition) {
      throw new Error('Expected due release lookup to build a condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain(
      '"organization_sms_senders"."release_scheduled_at" <= $1',
    );
    expect(query.sql).toContain(
      '"organization_sms_senders"."provider_phone_number_id" is not null',
    );
    expect(query.params).toEqual([
      '2026-06-18T00:00:00.000Z',
      'released',
    ]);
  });

  it('marks a sender released and removes active provider references', async () => {
    let updateSet: Record<string, unknown> | undefined;
    const db = {
      update: () => ({
        set: (set: Record<string, unknown>) => {
          updateSet = set;

          return {
            where: () => ({
              returning: () => [{ ...senderRow, ...set }],
            }),
          };
        },
      }),
    };

    await markOrganizationSmsSenderReleased(db as never, {
      id: senderRow.id,
      releasedAt: new Date('2026-06-18T00:00:30.000Z'),
    });

    expect(updateSet).toMatchObject({
      status: 'released',
      phoneNumber: null,
      providerMessagingServiceId: null,
      providerPhoneNumberId: null,
      regulatoryStatus: null,
      failureReason: null,
      releasedAt: new Date('2026-06-18T00:00:30.000Z'),
    });
  });

  it('marks release failures with user-safe copy for retry', async () => {
    let updateSet: Record<string, unknown> | undefined;
    const db = {
      update: () => ({
        set: (set: Record<string, unknown>) => {
          updateSet = set;

          return {
            where: () => ({
              returning: () => [{ ...senderRow, ...set }],
            }),
          };
        },
      }),
    };

    await markOrganizationSmsSenderReleaseFailed(db as never, {
      id: senderRow.id,
      failureReason:
        'Sender release needs support review. Retaino has been notified.',
    });

    expect(updateSet).toMatchObject({
      status: 'release_failed',
      failureReason:
        'Sender release needs support review. Retaino has been notified.',
    });
  });
});
