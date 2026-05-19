import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
import {
  assertCampaignDraftStatus,
  campaignAudienceWhere,
  campaignToContract,
  countCampaignRecipients,
  createAuditLog,
  deleteCampaignDraft,
  launchCampaign,
  listCampaignRecipients,
  recipientToContract,
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
  readyToSendAt: null,
  readyToSendByUserId: null,
  createdAt: new Date('2026-05-16T00:00:00.000Z'),
  updatedAt: new Date('2026-05-16T00:00:00.000Z'),
};

const recipientRow = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: campaignRow.organizationId,
  campaignId: campaignRow.id,
  contactId: '55555555-5555-4555-8555-555555555555',
  status: 'selected',
  exclusionReason: null,
  name: 'Ada Lovelace',
  phone: '+46700000000',
  email: 'ada@example.com',
  normalizedPhone: '+46700000000',
  normalizedEmail: 'ada@example.com',
  phoneHash: 'phone-hash',
  emailHash: 'email-hash',
  lastBookingAt: new Date('2026-01-01T00:00:00.000Z'),
  lastContactedAt: null,
  selectedAt: new Date('2026-05-16T10:00:00.000Z'),
  queuedAt: null,
  sentAt: null,
  failedAt: null,
  createdAt: new Date('2026-05-16T10:00:00.000Z'),
  updatedAt: new Date('2026-05-16T10:00:00.000Z'),
};

describe('campaign query helpers', () => {
  it('maps campaign rows to shared contract shapes', () => {
    expect(campaignToContract(campaignRow)).toEqual({
      ...campaignRow,
      status: 'draft',
      createdAt: '2026-05-16T00:00:00.000Z',
      updatedAt: '2026-05-16T00:00:00.000Z',
    });

    expect(
      campaignToContract({
        ...campaignRow,
        bookingUrl: null,
        smsBody: null,
      }),
    ).toMatchObject({
      bookingUrl: null,
      smsBody: null,
    });
  });

  it('maps recipient snapshot rows to shared contract shapes', () => {
    expect(recipientToContract(recipientRow)).toEqual({
      id: recipientRow.id,
      organizationId: recipientRow.organizationId,
      campaignId: recipientRow.campaignId,
      contactId: recipientRow.contactId,
      status: 'selected',
      exclusionReason: recipientRow.exclusionReason,
      name: recipientRow.name,
      phone: recipientRow.phone,
      email: recipientRow.email,
      lastBookingAt: '2026-01-01T00:00:00.000Z',
      lastContactedAt: null,
      selectedAt: '2026-05-16T10:00:00.000Z',
      queuedAt: null,
      sentAt: null,
      failedAt: null,
      createdAt: '2026-05-16T10:00:00.000Z',
      updatedAt: '2026-05-16T10:00:00.000Z',
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

  it('launches a draft campaign by snapshotting recipients and writing audit', async () => {
    const now = new Date('2026-05-16T10:00:00.000Z');
    let launchTransitionWhere: SQL | undefined;
    const contactRow = {
      contactId: recipientRow.contactId,
      name: recipientRow.name,
      phone: recipientRow.phone,
      email: recipientRow.email,
      normalizedPhone: recipientRow.normalizedPhone,
      normalizedEmail: recipientRow.normalizedEmail,
      phoneHash: recipientRow.phoneHash,
      emailHash: recipientRow.emailHash,
      lastBookingAt: recipientRow.lastBookingAt,
      lastContactedAt: recipientRow.lastContactedAt,
    };
    const insertedRecipients: unknown[] = [];
    const auditValues: unknown[] = [];
    const updatedCampaign = {
      ...campaignRow,
      status: 'ready_to_send',
      readyToSendAt: now,
      readyToSendByUserId: campaignRow.createdByUserId,
      updatedAt: now,
    };
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [campaignRow],
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => [contactRow],
            }),
          }),
        }),
      insert: vi.fn(() => ({
        values: (values: unknown) => {
          if (Array.isArray(values)) {
            insertedRecipients.push(...values);
          } else {
            auditValues.push(values);
          }

          return {
            returning: () => (Array.isArray(values) ? [recipientRow] : []),
          };
        },
      })),
      update: vi.fn(() => ({
        set: () => ({
          where: (condition: SQL | undefined) => {
            launchTransitionWhere = condition;

            return {
              returning: () => [updatedCampaign],
            };
          },
        }),
      })),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    const result = await launchCampaign(db as never, {
      organizationId: campaignRow.organizationId,
      campaignId: campaignRow.id,
      actorUserId: campaignRow.createdByUserId,
      ipAddress: '203.0.113.1',
      userAgent: 'vitest',
      now,
    });

    if (!launchTransitionWhere) {
      throw new Error('Expected launchCampaign to build a transition condition.');
    }

    const transitionQuery = new PgDialect().sqlToQuery(
      sql`select 1 where ${launchTransitionWhere}`,
    );

    expect(transitionQuery.sql).toContain('"campaigns"."organization_id" = $1');
    expect(transitionQuery.sql).toContain('"campaigns"."id" = $2');
    expect(transitionQuery.sql).toContain('"campaigns"."status" = $3');
    expect(transitionQuery.sql).toContain('"campaigns"."updated_at" = $4');
    expect(transitionQuery.params).toEqual([
      campaignRow.organizationId,
      campaignRow.id,
      'draft',
      campaignRow.updatedAt.toISOString(),
    ]);
    expect(result).toMatchObject({
      status: 'launched',
      recipientCount: 1,
      campaign: {
        status: 'ready_to_send',
        readyToSendAt: '2026-05-16T10:00:00.000Z',
      },
    });
    expect(insertedRecipients).toEqual([
      expect.objectContaining({
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        contactId: recipientRow.contactId,
        name: recipientRow.name,
        normalizedPhone: recipientRow.normalizedPhone,
        selectedAt: now,
      }),
    ]);
    expect(auditValues).toEqual([
      expect.objectContaining({
        organizationId: campaignRow.organizationId,
        actorUserId: campaignRow.createdByUserId,
        eventType: 'campaign.ready_to_send',
        resourceType: 'campaign',
        resourceId: campaignRow.id,
        ipAddress: '203.0.113.1',
        userAgent: 'vitest',
        metadata: expect.objectContaining({
          audienceRule: campaignRow.audienceRule,
          recipientCount: 1,
        }),
      }),
    ]);
  });

  it('chunks recipient snapshot inserts for larger audiences', async () => {
    const contactRows = Array.from({ length: 1001 }, (_, index) => ({
      contactId: `55555555-5555-4555-8555-${String(index).padStart(12, '0')}`,
      name: recipientRow.name,
      phone: recipientRow.phone,
      email: recipientRow.email,
      normalizedPhone: recipientRow.normalizedPhone,
      normalizedEmail: recipientRow.normalizedEmail,
      phoneHash: `${recipientRow.phoneHash}-${index}`,
      emailHash: `${recipientRow.emailHash}-${index}`,
      lastBookingAt: recipientRow.lastBookingAt,
      lastContactedAt: recipientRow.lastContactedAt,
    }));
    const recipientBatchSizes: number[] = [];
    const updatedCampaign = {
      ...campaignRow,
      status: 'ready_to_send',
      readyToSendAt: new Date('2026-05-16T10:00:00.000Z'),
      readyToSendByUserId: campaignRow.createdByUserId,
      updatedAt: new Date('2026-05-16T10:00:00.000Z'),
    };
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [campaignRow],
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => contactRows,
            }),
          }),
        }),
      update: vi.fn(() => ({
        set: () => ({
          where: () => ({
            returning: () => [updatedCampaign],
          }),
        }),
      })),
      insert: vi.fn(() => ({
        values: (values: unknown) => {
          if (Array.isArray(values)) {
            recipientBatchSizes.push(values.length);
          }

          return {
            returning: () => (Array.isArray(values) ? values : []),
          };
        },
      })),
    };
    await expect(
      launchCampaign(
        {
          transaction: async (callback: (inner: typeof tx) => unknown) =>
            callback(tx),
        } as never,
        {
          organizationId: campaignRow.organizationId,
          campaignId: campaignRow.id,
          actorUserId: campaignRow.createdByUserId,
        },
      ),
    ).resolves.toMatchObject({
      status: 'launched',
      recipientCount: 1001,
    });

    expect(recipientBatchSizes).toEqual([1000, 1]);
  });

  it('rejects launch when a campaign is not a draft or has no eligible audience', async () => {
    const nonDraftDb = {
      transaction: async (callback: (inner: unknown) => unknown) =>
        callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => [{ ...campaignRow, status: 'ready_to_send' }],
              }),
            }),
          }),
        }),
    };

    await expect(
      launchCampaign(nonDraftDb as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
      }),
    ).resolves.toEqual({ status: 'not_editable' });

    const emptyDb = {
      transaction: async (callback: (inner: unknown) => unknown) =>
        callback({
          select: vi
            .fn()
            .mockReturnValueOnce({
              from: () => ({
                where: () => ({
                  limit: () => [campaignRow],
                }),
              }),
            })
            .mockReturnValueOnce({
              from: () => ({
                where: () => ({
                  orderBy: () => [],
                }),
              }),
            }),
        }),
    };

    await expect(
      launchCampaign(emptyDb as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
      }),
    ).resolves.toEqual({ status: 'empty_audience' });
  });

  it('does not commit recipient snapshots when launch loses the draft race', async () => {
    const insertedRecipients: unknown[] = [];
    const auditValues: unknown[] = [];
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [campaignRow],
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => [
                {
                  contactId: recipientRow.contactId,
                  name: recipientRow.name,
                  phone: recipientRow.phone,
                  email: recipientRow.email,
                  normalizedPhone: recipientRow.normalizedPhone,
                  normalizedEmail: recipientRow.normalizedEmail,
                  phoneHash: recipientRow.phoneHash,
                  emailHash: recipientRow.emailHash,
                  lastBookingAt: recipientRow.lastBookingAt,
                  lastContactedAt: recipientRow.lastContactedAt,
                },
              ],
            }),
          }),
        }),
      insert: vi.fn(() => ({
        values: (values: unknown) => {
          if (Array.isArray(values)) {
            insertedRecipients.push(...values);
          } else {
            auditValues.push(values);
          }

          return {
            returning: () => [],
          };
        },
      })),
      update: vi.fn(() => ({
        set: () => ({
          where: () => ({
            returning: () => [],
          }),
        }),
      })),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await expect(
      launchCampaign(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
      }),
    ).resolves.toEqual({ status: 'not_editable' });

    expect(insertedRecipients).toEqual([]);
    expect(auditValues).toEqual([]);
  });

  it('lists campaign recipients with organization and campaign filters', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              orderBy: () => [recipientRow],
            };
          },
        }),
      }),
    };

    await expect(
      listCampaignRecipients(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
      }),
    ).resolves.toEqual({ recipients: [recipientToContract(recipientRow)] });

    if (!whereCondition) {
      throw new Error('Expected listCampaignRecipients to build a where condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"campaign_recipients"."organization_id" = $1');
    expect(query.sql).toContain('"campaign_recipients"."campaign_id" = $2');
    expect(query.params).toEqual([campaignRow.organizationId, campaignRow.id]);
  });

  it('counts campaign recipients without loading snapshots', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return [{ total: 12 }];
          },
        }),
      }),
    };

    await expect(
      countCampaignRecipients(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
      }),
    ).resolves.toEqual({ recipientCount: 12 });

    if (!whereCondition) {
      throw new Error('Expected countCampaignRecipients to build a where condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"campaign_recipients"."organization_id" = $1');
    expect(query.sql).toContain('"campaign_recipients"."campaign_id" = $2');
    expect(query.params).toEqual([campaignRow.organizationId, campaignRow.id]);
  });

  it('creates tenant-scoped audit logs', async () => {
    const inserted: unknown[] = [];
    const db = {
      insert: () => ({
        values: (values: unknown) => {
          inserted.push(values);

          return {
            returning: () => [],
          };
        },
      }),
    };

    await createAuditLog(db as never, {
      organizationId: campaignRow.organizationId,
      actorUserId: campaignRow.createdByUserId,
      eventType: 'campaign.ready_to_send',
      resourceType: 'campaign',
      resourceId: campaignRow.id,
      metadata: { recipientCount: 1 },
      ipAddress: null,
      userAgent: null,
    });

    expect(inserted).toEqual([
      expect.objectContaining({
        organizationId: campaignRow.organizationId,
        actorUserId: campaignRow.createdByUserId,
        eventType: 'campaign.ready_to_send',
        resourceType: 'campaign',
        resourceId: campaignRow.id,
        metadata: { recipientCount: 1 },
      }),
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
