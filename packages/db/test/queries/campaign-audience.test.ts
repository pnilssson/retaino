import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
import {
  campaignAudienceWhere,
  findCampaignSendExclusionForRecipient,
  getCampaignTestSmsContact,
  searchCampaignTestSmsContacts,
} from '../../src/queries/campaign-audience';
import { campaignRow, recipientRow } from './campaign-fixtures';

describe('campaign audience query helpers', () => {
  it('builds audience eligibility with selected and recent campaign exclusions', () => {
    const condition = campaignAudienceWhere(
      campaignRow.organizationId,
      {
        lapsedDays: 90,
        includeNoBookingDate: false,
        excludeCampaignIds: [
          '88888888-8888-4888-8888-888888888888',
          '99999999-9999-4999-8999-999999999999',
        ],
        recentCampaignExclusionDays: 30,
      },
      new Date('2026-05-16T10:00:00.000Z'),
    );

    const query = new PgDialect().sqlToQuery(sql`select 1 where ${condition}`);

    expect(query.sql).toContain('"contacts"."organization_id" =');
    expect(query.sql).toContain('not exists');
    expect(query.sql).toContain('"campaign_recipients"');
    expect(query.sql).toContain('"campaign_recipients"."sent_at" is not null');
    expect(query.sql).toContain('"campaign_recipients"."campaign_id" in');
    expect(query.sql).toContain('"contacts"."last_contacted_at" >=');
    expect(query.sql).toContain('in ($');
    expect(query.params).toContain('88888888-8888-4888-8888-888888888888');
    expect(query.params).toContain('99999999-9999-4999-8999-999999999999');
    expect(query.params.map(String)).toContain('2026-04-16T10:00:00.000Z');
  });

  it('builds recent campaign protection from contact last contacted dates', () => {
    const condition = campaignAudienceWhere(
      campaignRow.organizationId,
      {
        lapsedDays: 90,
        includeNoBookingDate: false,
        excludeCampaignIds: [],
        recentCampaignExclusionDays: 14,
      },
      new Date('2026-05-16T10:00:00.000Z'),
    );

    const query = new PgDialect().sqlToQuery(sql`select 1 where ${condition}`);

    expect(query.sql).toContain('"contacts"."last_contacted_at" is not null');
    expect(query.sql).toContain('"contacts"."last_contacted_at" >=');
    expect(query.sql).not.toContain('"campaign_recipients"."sent_at" >=');
    expect(query.params.map(String)).toContain('2026-05-02T10:00:00.000Z');
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

  it('searches eligible audience contacts for test SMS samples', async () => {
    let selectedColumns: unknown;
    let whereCondition: SQL | undefined;
    const db = {
      select: (columns: unknown) => {
        selectedColumns = columns;

        return {
          from: () => ({
            where: (condition: SQL | undefined) => {
              whereCondition = condition;

              return {
                orderBy: () => ({
                  limit: () => [
                    {
                      id: '66666666-6666-4666-8666-666666666666',
                      name: 'Ada Lovelace',
                      phone: '+46700000000',
                      email: 'ada@example.com',
                      lastBookingAt: new Date('2026-01-01T00:00:00.000Z'),
                    },
                  ],
                }),
              };
            },
          }),
        };
      },
    };

    await expect(
      searchCampaignTestSmsContacts(db as never, {
        organizationId: campaignRow.organizationId,
        audienceRule: {
          lapsedDays: 90,
          includeNoBookingDate: false,
          excludeCampaignIds: [],
          recentCampaignExclusionDays: 30,
        },
        search: 'ada',
        now: new Date('2026-05-16T10:00:00.000Z'),
      }),
    ).resolves.toEqual({
      contacts: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          name: 'Ada Lovelace',
          phone: '+46700000000',
          email: 'ada@example.com',
          lastBookingAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(selectedColumns).toBeDefined();
    if (!whereCondition) {
      throw new Error('Expected test SMS contact search condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"contacts"."organization_id" =');
    expect(query.sql).toContain('"contacts"."normalized_phone" is not null');
    expect(query.sql).toContain('"contacts"."consent_status" =');
    expect(query.sql).toContain('"contacts"."name" ilike');
    expect(query.sql).toContain('"contacts"."phone" ilike');
    expect(query.sql).toContain('"contacts"."email" ilike');
    expect(query.sql).toContain('not exists');
    expect(query.params).toContain('%ada%');
  });

  it('returns one eligible audience contact for test SMS personalization', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              limit: () => [
                {
                  id: '66666666-6666-4666-8666-666666666666',
                  name: 'Ada Lovelace',
                  phone: '+46700000000',
                  email: 'ada@example.com',
                  lastBookingAt: new Date('2026-01-01T00:00:00.000Z'),
                },
              ],
            };
          },
        }),
      }),
    };

    await expect(
      getCampaignTestSmsContact(db as never, {
        organizationId: campaignRow.organizationId,
        audienceRule: {
          lapsedDays: 90,
          includeNoBookingDate: false,
          excludeCampaignIds: [],
          recentCampaignExclusionDays: 30,
        },
        contactId: '66666666-6666-4666-8666-666666666666',
        now: new Date('2026-05-16T10:00:00.000Z'),
      }),
    ).resolves.toEqual({
      id: '66666666-6666-4666-8666-666666666666',
      name: 'Ada Lovelace',
      phone: '+46700000000',
      email: 'ada@example.com',
      lastBookingAt: '2026-01-01T00:00:00.000Z',
    });

    if (!whereCondition) {
      throw new Error('Expected test SMS contact lookup condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"contacts"."id" =');
    expect(query.sql).toContain('"contacts"."normalized_phone" is not null');
    expect(query.sql).toContain('not exists');
    expect(query.params).toContain('66666666-6666-4666-8666-666666666666');
  });

  it('rechecks selected campaign send exclusions before provider send', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              limit: () => [{ id: recipientRow.id }],
            };
          },
        }),
      }),
    };

    await expect(
      findCampaignSendExclusionForRecipient(db as never, {
        organizationId: campaignRow.organizationId,
        contactId: recipientRow.contactId,
        phoneHash: recipientRow.phoneHash,
        audienceRule: {
          lapsedDays: 90,
          includeNoBookingDate: false,
          excludeCampaignIds: ['99999999-9999-4999-8999-999999999999'],
          recentCampaignExclusionDays: 30,
        },
        now: new Date('2026-05-16T10:00:00.000Z'),
      }),
    ).resolves.toBe('selected_campaign_send');

    if (!whereCondition) {
      throw new Error('Expected selected campaign exclusion condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"campaign_recipients"."organization_id" = $1');
    expect(query.sql).toContain('"campaign_recipients"."campaign_id" in');
    expect(query.sql).toContain('"campaign_recipients"."sent_at" is not null');
    expect(query.params).toContain('99999999-9999-4999-8999-999999999999');
    expect(query.params).toContain(recipientRow.contactId);
    expect(query.params).toContain(recipientRow.phoneHash);
  });

  it('rechecks recent campaign send exclusions before provider send', async () => {
    const whereConditions: SQL[] = [];
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: () => ({
            where: (condition: SQL | undefined) => {
              if (condition) {
                whereConditions.push(condition);
              }

              return {
                limit: () => [],
              };
            },
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: (condition: SQL | undefined) => {
              if (condition) {
                whereConditions.push(condition);
              }

              return {
                limit: () => [{ id: recipientRow.id }],
              };
            },
          }),
        }),
    };

    await expect(
      findCampaignSendExclusionForRecipient(db as never, {
        organizationId: campaignRow.organizationId,
        contactId: recipientRow.contactId,
        phoneHash: recipientRow.phoneHash,
        audienceRule: {
          lapsedDays: 90,
          includeNoBookingDate: false,
          excludeCampaignIds: ['99999999-9999-4999-8999-999999999999'],
          recentCampaignExclusionDays: 14,
        },
        now: new Date('2026-05-16T10:00:00.000Z'),
      }),
    ).resolves.toBe('recent_campaign_send');

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereConditions[1]}`,
    );

    expect(query.sql).toContain('"contacts"."organization_id" = $1');
    expect(query.sql).toContain('"contacts"."last_contacted_at" >=');
    expect(query.sql).toContain('"contacts"."id" =');
    expect(query.sql).toContain('"contacts"."phone_hash" =');
    expect(query.sql).not.toContain('"campaign_recipients"."sent_at" >=');
    expect(query.params.map(String)).toContain('2026-05-02T10:00:00.000Z');
  });
});
