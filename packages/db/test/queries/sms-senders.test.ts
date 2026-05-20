import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  getOrganizationSmsSender,
  getOrganizationSmsSenderByProviderReference,
  organizationSmsSenderToContract,
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
  createdAt: new Date('2026-05-18T00:00:00.000Z'),
  updatedAt: new Date('2026-05-18T00:01:00.000Z'),
};

describe('organization SMS sender query helpers', () => {
  it('maps sender rows to shared contract shapes', () => {
    expect(organizationSmsSenderToContract(senderRow)).toEqual({
      ...senderRow,
      provider: 'twilio',
      status: 'ready',
      provisionedAt: '2026-05-18T00:00:00.000Z',
      lastVerifiedAt: '2026-05-18T00:01:00.000Z',
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:01:00.000Z',
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
    });

    expect(conflictTarget).toHaveLength(2);
  });
});
