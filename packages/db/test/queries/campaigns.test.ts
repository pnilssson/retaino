import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  assertCampaignDraftStatus,
  campaignAudienceWhere,
  campaignToContract,
  deleteCampaignDraft,
  updateCampaignDraft,
} from '../../src/queries/campaigns';

const campaignRow = {
  id: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  createdByUserId: '33333333-3333-4333-8333-333333333333',
  name: 'June reactivation',
  status: 'draft',
  audienceRule: { lapsedDays: 90, includeNoBookingDate: false },
  smsBody: 'We have openings this week.',
  bookingUrl: 'https://booking.example.com/studio',
  campaignCode: null,
  attributionWindowDays: 7,
  createdAt: new Date('2026-05-16T00:00:00.000Z'),
  updatedAt: new Date('2026-05-16T00:00:00.000Z'),
};

describe('campaign query helpers', () => {
  it('maps campaign rows to shared contract shapes', () => {
    expect(campaignToContract(campaignRow)).toEqual({
      ...campaignRow,
      status: 'draft',
      createdAt: '2026-05-16T00:00:00.000Z',
      updatedAt: '2026-05-16T00:00:00.000Z',
    });
  });

  it('rejects non-draft campaign mutations', () => {
    expect(() =>
      assertCampaignDraftStatus({ ...campaignRow, status: 'ready_to_send' }),
    ).toThrow('Campaign is not editable.');
  });

  it('updates drafts with organization and draft filters', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      update: () => ({
        set: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              returning: () => [campaignRow],
            };
          },
        }),
      }),
    };

    await updateCampaignDraft(db as never, {
      organizationId: campaignRow.organizationId,
      campaignId: campaignRow.id,
      input: { name: 'Updated' },
    });

    if (!whereCondition) {
      throw new Error('Expected updateCampaignDraft to build a where condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"campaigns"."organization_id" = $1');
    expect(query.sql).toContain('"campaigns"."id" = $2');
    expect(query.sql).toContain('"campaigns"."status" = $3');
    expect(query.params).toEqual([
      campaignRow.organizationId,
      campaignRow.id,
      'draft',
    ]);
  });

  it('deletes drafts with organization and draft filters', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      delete: () => ({
        where: (condition: SQL | undefined) => {
          whereCondition = condition;

          return {
            returning: () => [{ id: campaignRow.id }],
          };
        },
      }),
    };

    await deleteCampaignDraft(db as never, {
      organizationId: campaignRow.organizationId,
      campaignId: campaignRow.id,
    });

    if (!whereCondition) {
      throw new Error('Expected deleteCampaignDraft to build a where condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"campaigns"."organization_id" = $1');
    expect(query.sql).toContain('"campaigns"."id" = $2');
    expect(query.sql).toContain('"campaigns"."status" = $3');
    expect(query.params).toEqual([
      campaignRow.organizationId,
      campaignRow.id,
      'draft',
    ]);
  });

  it('builds eligible audience filters with SMS readiness and suppression checks', () => {
    const condition = campaignAudienceWhere(
      campaignRow.organizationId,
      { lapsedDays: 90, includeNoBookingDate: false },
      new Date('2026-05-16T00:00:00.000Z'),
    );

    if (!condition) {
      throw new Error('Expected campaignAudienceWhere to build a condition.');
    }

    const query = new PgDialect().sqlToQuery(sql`select 1 where ${condition}`);

    expect(query.sql).toContain('"contacts"."organization_id" = $');
    expect(query.sql).toContain('"contacts"."normalized_phone" is not null');
    expect(query.sql).toContain('"contacts"."consent_status" = $');
    expect(query.sql).toContain('"contacts"."last_booking_at" <= $');
    expect(query.sql).toContain('not exists');
    expect(query.sql).toContain('"suppressions"."type" = $');
    expect(query.sql).not.toContain('"contacts"."last_booking_at" is null');
  });

  it('includes missing booking dates only when explicitly requested', () => {
    const condition = campaignAudienceWhere(
      campaignRow.organizationId,
      { lapsedDays: 90, includeNoBookingDate: true },
      new Date('2026-05-16T00:00:00.000Z'),
    );

    if (!condition) {
      throw new Error('Expected campaignAudienceWhere to build a condition.');
    }

    const query = new PgDialect().sqlToQuery(sql`select 1 where ${condition}`);

    expect(query.sql).toContain('"contacts"."last_booking_at" <= $');
    expect(query.sql).toContain('"contacts"."last_booking_at" is null');
  });
});
