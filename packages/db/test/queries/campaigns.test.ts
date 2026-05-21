import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
import {
  campaignAudienceWhere,
  countCampaignRecipients,
  createAuditLog,
  deleteCampaignDraft,
  getCampaignReport,
  getLatestCampaignRecipientByPhoneHash,
  listSelectedCampaignRecipientsForSend,
  launchCampaign,
  markCampaignRecipientSkipped,
  markCampaignRecipientSent,
  markCampaignSendCompleted,
  markCampaignSendFailed,
  startCampaignSend,
  updateCampaignDraft,
} from '../../src/queries/campaigns';
import {
  createInboundSmsMessage,
  createOutboundSmsMessage,
  getSmsMessageByProviderMessageId,
  getTrackingLinkByCode,
  recordCampaignMessageEvent,
  recordTrackingClick,
  recordSmsMessageProviderResult,
  upsertTrackingLink,
} from '../../src/queries/campaign-communications';
import { campaignMessageEvents } from '../../src/schema/campaign-message-events';

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
  sendStartedAt: null,
  sentAt: null,
  failedAt: null,
  failureReason: null,
  reservedCreditCount: null,
  actualCreditCount: null,
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

const messageEventRow = {
  id: '88888888-8888-4888-8888-888888888888',
  organizationId: campaignRow.organizationId,
  campaignId: campaignRow.id,
  messageId: '77777777-7777-4777-8777-777777777777',
  recipientId: recipientRow.id,
  provider: 'fake',
  providerMessageId: 'fake-message-1',
  eventType: 'delivered',
  rawStatus: 'delivered',
  rawPayload: { MessageStatus: 'delivered' },
  occurredAt: new Date('2026-05-16T10:01:00.000Z'),
  createdAt: new Date('2026-05-16T10:01:00.000Z'),
};

const clickEventRow = {
  id: '99999999-9999-4999-8999-999999999999',
  organizationId: campaignRow.organizationId,
  campaignId: campaignRow.id,
  recipientId: recipientRow.id,
  trackingLinkId: '66666666-6666-4666-8666-666666666666',
  userAgent: 'Mozilla/5.0',
  occurredAt: new Date('2026-05-16T10:02:00.000Z'),
  createdAt: new Date('2026-05-16T10:02:00.000Z'),
};

const trackingLinkRow = {
  id: '66666666-6666-4666-8666-666666666666',
  organizationId: campaignRow.organizationId,
  campaignId: campaignRow.id,
  recipientId: recipientRow.id,
  code: 'abc123',
  targetUrl: 'https://booking.example.com/studio',
  createdAt: new Date('2026-05-16T10:00:00.000Z'),
  updatedAt: new Date('2026-05-16T10:00:00.000Z'),
};

const smsMessageRow = {
  id: '77777777-7777-4777-8777-777777777777',
  organizationId: campaignRow.organizationId,
  direction: 'outbound',
  campaignId: campaignRow.id,
  recipientId: recipientRow.id,
  contactId: recipientRow.contactId,
  provider: 'fake',
  providerMessageId: null,
  providerMessagingServiceId: null,
  providerPhoneNumberId: null,
  fromPhone: '+46700000000',
  toPhone: '+46701111111',
  body: 'Hi Anna',
  status: 'queued',
  estimatedSegmentCount: 1,
  actualSegmentCount: null,
  estimatedCostMinor: null,
  actualCostMinor: null,
  currency: 'SEK',
  queuedAt: new Date('2026-05-16T10:00:00.000Z'),
  sentAt: null,
  receivedAt: null,
  deliveredAt: null,
  failedAt: null,
  createdAt: new Date('2026-05-16T10:00:00.000Z'),
  updatedAt: new Date('2026-05-16T10:00:00.000Z'),
};

describe('campaign query helpers', () => {
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

  it('loads send-attempt recipients for campaign sending', async () => {
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
      listSelectedCampaignRecipientsForSend(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
      }),
    ).resolves.toEqual({
      recipients: [
        expect.objectContaining({
          id: recipientRow.id,
          phoneHash: recipientRow.phoneHash,
          normalizedPhone: recipientRow.normalizedPhone,
          status: 'selected',
        }),
      ],
    });

    if (!whereCondition) {
      throw new Error(
        'Expected listSelectedCampaignRecipientsForSend to build a where condition.',
      );
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"campaign_recipients"."organization_id" = $1');
    expect(query.sql).toContain('"campaign_recipients"."campaign_id" = $2');
    expect(query.sql).toContain('"campaign_recipients"."status" in ($3, $4)');
    expect(query.params).toEqual([
      campaignRow.organizationId,
      campaignRow.id,
      'selected',
      'sent',
    ]);
  });

  it('upserts one tracking link per campaign recipient', async () => {
    const upsertValues: unknown[] = [];
    const db = {
      insert: () => ({
        values: (values: unknown) => {
          upsertValues.push(values);

          return {
            onConflictDoUpdate: () => ({
              returning: () => [trackingLinkRow],
            }),
          };
        },
      }),
    };

    await expect(
      upsertTrackingLink(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        recipientId: recipientRow.id,
        code: trackingLinkRow.code,
        targetUrl: trackingLinkRow.targetUrl,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: trackingLinkRow.id,
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        recipientId: recipientRow.id,
      }),
    );
    expect(upsertValues).toEqual([
      expect.objectContaining({
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        recipientId: recipientRow.id,
        code: trackingLinkRow.code,
      }),
    ]);
  });

  it('loads tracking links by public code without tenant input', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              limit: () => [trackingLinkRow],
            };
          },
        }),
      }),
    };

    await expect(getTrackingLinkByCode(db as never, 'abc123')).resolves.toEqual(
      expect.objectContaining({
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        recipientId: recipientRow.id,
      }),
    );

    if (!whereCondition) {
      throw new Error('Expected getTrackingLinkByCode to build a condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"tracking_links"."code" = $1');
    expect(query.params).toEqual(['abc123']);
  });

  it('records click events', async () => {
    const insertValues: unknown[] = [];
    const db = {
      insert: () => ({
        values: (value: unknown) => {
          insertValues.push(value);

          return {
            returning: () => [clickEventRow],
          };
        },
      }),
    };

    await expect(
      recordTrackingClick(db as never, {
        trackingLink: {
          id: trackingLinkRow.id,
          organizationId: trackingLinkRow.organizationId,
          campaignId: trackingLinkRow.campaignId,
          recipientId: trackingLinkRow.recipientId,
          code: trackingLinkRow.code,
          targetUrl: trackingLinkRow.targetUrl,
          createdAt: '2026-05-16T10:00:00.000Z',
          updatedAt: '2026-05-16T10:00:00.000Z',
        },
        userAgent: 'Mozilla/5.0',
        now: new Date('2026-05-16T10:02:00.000Z'),
      }),
    ).resolves.toEqual(expect.objectContaining({ id: clickEventRow.id }));

    expect(insertValues[0]).toMatchObject({
      organizationId: campaignRow.organizationId,
      campaignId: campaignRow.id,
      recipientId: recipientRow.id,
      trackingLinkId: trackingLinkRow.id,
      userAgent: 'Mozilla/5.0',
    });
  });

  it('finds the latest sent campaign recipient by phone hash', async () => {
    let whereCondition: SQL | undefined;
    const sentRecipient = {
      ...recipientRow,
      status: 'sent',
      sentAt: new Date('2026-05-16T10:01:00.000Z'),
    };
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              orderBy: () => ({
                limit: () => [sentRecipient],
              }),
            };
          },
        }),
      }),
    };

    await expect(
      getLatestCampaignRecipientByPhoneHash(db as never, {
        organizationId: campaignRow.organizationId,
        phoneHash: 'phone-hash-1',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: recipientRow.id,
        campaignId: campaignRow.id,
        contactId: recipientRow.contactId,
      }),
    );

    if (!whereCondition) {
      throw new Error('Expected getLatestCampaignRecipientByPhoneHash condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );
    expect(query.sql).toContain('"campaign_recipients"."organization_id" = $1');
    expect(query.sql).toContain('"campaign_recipients"."phone_hash" = $2');
    expect(query.sql).toContain('"campaign_recipients"."sent_at" is not null');
    expect(query.params).toEqual([campaignRow.organizationId, 'phone-hash-1']);
  });

  it('creates outbound SMS messages idempotently per campaign recipient', async () => {
    const db = {
      insert: () => ({
        values: () => ({
          onConflictDoNothing: () => ({
            returning: () => [],
          }),
        }),
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => [smsMessageRow],
          }),
        }),
      }),
    };

    await expect(
      createOutboundSmsMessage(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        recipientId: recipientRow.id,
        contactId: recipientRow.contactId,
        provider: 'fake',
        fromPhone: '+46700000000',
        toPhone: '+46701111111',
        body: 'Hi Anna',
        estimatedSegmentCount: 1,
        currency: 'SEK',
        now: new Date('2026-05-16T10:00:00.000Z'),
      }),
    ).resolves.toEqual({
      status: 'existing',
      message: expect.objectContaining({
        id: smsMessageRow.id,
        campaignId: campaignRow.id,
        recipientId: recipientRow.id,
        status: 'queued',
      }),
    });
  });

  it('loads SMS messages by provider message id for callbacks', async () => {
    let whereCondition: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              limit: () => [{ ...smsMessageRow, providerMessageId: 'fake-1' }],
            };
          },
        }),
      }),
    };

    await getSmsMessageByProviderMessageId(db as never, {
      provider: 'fake',
      providerMessageId: 'fake-1',
    });

    if (!whereCondition) {
      throw new Error(
        'Expected getSmsMessageByProviderMessageId to build a condition.',
      );
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"sms_messages"."provider" = $1');
    expect(query.sql).toContain('"sms_messages"."provider_message_id" = $2');
    expect(query.params).toEqual(['fake', 'fake-1']);
  });

  it('records provider message events', async () => {
    const db = {
      insert: () => ({
        values: (value: unknown) => {
          expect(value).toMatchObject({
            organizationId: campaignRow.organizationId,
            campaignId: campaignRow.id,
            messageId: smsMessageRow.id,
            recipientId: recipientRow.id,
            provider: 'fake',
            providerMessageId: 'fake-message-1',
            eventType: 'delivered',
            rawStatus: 'delivered',
          });

          return {
            onConflictDoNothing: (config: unknown) => {
              expect(config).toMatchObject({
                target: [
                  campaignMessageEvents.provider,
                  campaignMessageEvents.providerMessageId,
                  campaignMessageEvents.eventType,
                ],
              });

              return {
                returning: () => [messageEventRow],
              };
            },
          };
        },
      }),
    };

    await expect(
      recordCampaignMessageEvent(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        messageId: smsMessageRow.id,
        recipientId: recipientRow.id,
        provider: 'fake',
        providerMessageId: 'fake-message-1',
        eventType: 'delivered',
        rawStatus: 'delivered',
        rawPayload: { MessageStatus: 'delivered' },
        occurredAt: new Date('2026-05-16T10:01:00.000Z'),
      }),
    ).resolves.toEqual(expect.objectContaining({ eventType: 'delivered' }));
  });

  it('creates inbound SMS message rows in the canonical ledger', async () => {
    const db = {
      insert: () => ({
        values: (value: unknown) => {
          expect(value).toMatchObject({
            organizationId: campaignRow.organizationId,
            direction: 'inbound',
            provider: 'fake',
            providerMessageId: 'inbound-1',
            fromPhone: '+46701111111',
            toPhone: '+46700000000',
            body: 'STOP',
            status: 'received',
          });

          return {
            onConflictDoNothing: () => ({
              returning: () => [
                {
                  ...smsMessageRow,
                  direction: 'inbound',
                  providerMessageId: 'inbound-1',
                  fromPhone: '+46701111111',
                  toPhone: '+46700000000',
                  body: 'STOP',
                  status: 'received',
                  receivedAt: new Date('2026-05-16T10:03:00.000Z'),
                },
              ],
            }),
          };
        },
      }),
    };

    await expect(
      createInboundSmsMessage(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        recipientId: recipientRow.id,
        contactId: recipientRow.contactId,
        provider: 'fake',
        providerMessageId: 'inbound-1',
        providerMessagingServiceId: 'fake-ms-1',
        providerPhoneNumberId: null,
        fromPhone: '+46701111111',
        toPhone: '+46700000000',
        body: 'STOP',
        receivedAt: new Date('2026-05-16T10:03:00.000Z'),
      }),
    ).resolves.toEqual(expect.objectContaining({ direction: 'inbound' }));
  });

  it('marks campaigns sending with reserved credit counts', async () => {
    const now = new Date('2026-05-16T10:00:00.000Z');
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const db = {
      transaction: async (callback: (inner: unknown) => unknown) =>
        callback({
          execute,
          select: vi
            .fn()
            .mockReturnValueOnce({
              from: () => ({
                where: () => ({
                  limit: () => [],
                }),
              }),
            })
            .mockReturnValueOnce({
              from: () => ({
                where: () => ({
                  limit: () => [{ ...campaignRow, status: 'ready_to_send' }],
                }),
              }),
            }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => [
                  {
                    ...campaignRow,
                    status: 'sending',
                    sendStartedAt: now,
                    reservedCreditCount: 3,
                    updatedAt: now,
                  },
                ],
              }),
            }),
          }),
        }),
    };

    await expect(
      startCampaignSend(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        reservedCreditCount: 3,
        now,
      }),
    ).resolves.toMatchObject({
      status: 'started',
      campaign: {
        status: 'sending',
        sendStartedAt: '2026-05-16T10:00:00.000Z',
        reservedCreditCount: 3,
      },
    });

    expect(execute).toHaveBeenCalledTimes(1);
    const lockQuery = new PgDialect().sqlToQuery(
      execute.mock.calls[0]?.[0] as SQL,
    );
    expect(lockQuery.sql).toContain('pg_advisory_xact_lock');
    expect(lockQuery.params).toEqual([campaignRow.organizationId]);
  });

  it('records provider results on outbound SMS messages', async () => {
    const now = new Date('2026-05-16T10:01:00.000Z');
    const updatedMessage = {
      ...smsMessageRow,
      providerMessageId: 'fake-message-1',
      providerMessagingServiceId: 'fake-ms-1',
      providerPhoneNumberId: 'fake-pn-1',
      status: 'sent',
      actualSegmentCount: 1,
      actualCostMinor: 0,
      sentAt: now,
      updatedAt: now,
    };
    const db = {
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => [updatedMessage],
          }),
        }),
      }),
    };

    await expect(
      recordSmsMessageProviderResult(db as never, {
        organizationId: campaignRow.organizationId,
        messageId: smsMessageRow.id,
        providerMessageId: 'fake-message-1',
        providerMessagingServiceId: 'fake-ms-1',
        providerPhoneNumberId: 'fake-pn-1',
        status: 'sent',
        actualSegmentCount: 1,
        actualCostMinor: 0,
        currency: 'SEK',
        now,
      }),
    ).resolves.toMatchObject({
      status: 'sent',
      providerMessageId: 'fake-message-1',
      sentAt: '2026-05-16T10:01:00.000Z',
    });
  });

  it('preserves existing provider metrics when callbacks omit them', async () => {
    const now = new Date('2026-05-16T10:01:00.000Z');
    const updatedMessage = {
      ...smsMessageRow,
      providerMessageId: 'fake-message-1',
      providerMessagingServiceId: 'fake-ms-1',
      providerPhoneNumberId: 'fake-pn-1',
      status: 'delivered',
      actualSegmentCount: 1,
      actualCostMinor: 0,
      currency: 'SEK',
      deliveredAt: now,
      updatedAt: now,
    };
    const set = vi.fn(() => ({
      where: () => ({
        returning: () => [updatedMessage],
      }),
    }));
    const db = {
      update: () => ({ set }),
    };

    await expect(
      recordSmsMessageProviderResult(db as never, {
        organizationId: campaignRow.organizationId,
        messageId: smsMessageRow.id,
        providerMessageId: 'fake-message-1',
        providerMessagingServiceId: 'fake-ms-1',
        providerPhoneNumberId: 'fake-pn-1',
        status: 'delivered',
        actualSegmentCount: null,
        actualCostMinor: null,
        currency: null,
        now,
      }),
    ).resolves.toMatchObject({
      status: 'delivered',
      actualSegmentCount: 1,
      currency: 'SEK',
    });

    const setInput = set.mock.calls[0]?.[0] as Record<string, unknown>;
    const dialect = new PgDialect();
    const actualSegmentQuery = dialect.sqlToQuery(
      setInput.actualSegmentCount as SQL,
    );
    const actualCostQuery = dialect.sqlToQuery(setInput.actualCostMinor as SQL);
    const currencyQuery = dialect.sqlToQuery(setInput.currency as SQL);

    expect(actualSegmentQuery.sql).toContain('actual_segment_count');
    expect(actualCostQuery.sql).toContain('actual_cost_minor');
    expect(currencyQuery.sql).toContain('currency');
  });

  it('marks campaign recipients and campaigns after send attempts', async () => {
    const now = new Date('2026-05-16T10:02:00.000Z');
    const db = {
      update: vi
        .fn()
        .mockReturnValueOnce({
          set: () => ({
            where: () => ({
              returning: () => [{ ...recipientRow, status: 'sent', sentAt: now }],
            }),
          }),
        })
        .mockReturnValueOnce({
          set: () => ({
            where: () => ({
              returning: () => [
                {
                  ...recipientRow,
                  status: 'skipped',
                  exclusionReason: 'suppressed_phone',
                },
              ],
            }),
          }),
        })
        .mockReturnValueOnce({
          set: () => ({
            where: () => ({
              returning: () => [
                {
                  ...campaignRow,
                  status: 'sent',
                  sentAt: now,
                  actualCreditCount: 1,
                  updatedAt: now,
                },
              ],
            }),
          }),
        }),
    };

    await expect(
      markCampaignRecipientSent(db as never, {
        organizationId: campaignRow.organizationId,
        recipientId: recipientRow.id,
        now,
      }),
    ).resolves.toMatchObject({ status: 'sent' });
    await expect(
      markCampaignRecipientSkipped(db as never, {
        organizationId: campaignRow.organizationId,
        recipientId: recipientRow.id,
        exclusionReason: 'suppressed_phone',
        now,
      }),
    ).resolves.toMatchObject({
      status: 'skipped',
      exclusionReason: 'suppressed_phone',
    });
    await expect(
      markCampaignSendCompleted(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actualCreditCount: 1,
        now,
      }),
    ).resolves.toMatchObject({
      status: 'sent',
      actualCreditCount: 1,
    });
  });

  it('marks campaign sends failed with reason and actual credits', async () => {
    const now = new Date('2026-05-16T10:03:00.000Z');
    const db = {
      update: () => ({
        set: (values: unknown) => {
          expect(values).toMatchObject({
            status: 'failed',
            failedAt: now,
            failureReason: 'Provider send failed.',
            actualCreditCount: 1,
            updatedAt: now,
          });

          return {
            where: () => ({
              returning: () => [
                {
                  ...campaignRow,
                  status: 'failed',
                  failedAt: now,
                  failureReason: 'Provider send failed.',
                  actualCreditCount: 1,
                  updatedAt: now,
                },
              ],
            }),
          };
        },
      }),
    };

    await expect(
      markCampaignSendFailed(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        failureReason: 'Provider send failed.',
        actualCreditCount: 1,
        now,
      }),
    ).resolves.toMatchObject({
      status: 'failed',
      failedAt: '2026-05-16T10:03:00.000Z',
      failureReason: 'Provider send failed.',
      actualCreditCount: 1,
    });
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

  it('builds tenant-scoped campaign report aggregate queries', async () => {
    let statement: SQL | undefined;
    const db = {
      execute: (query: SQL) => {
        statement = query;

        return {
          rows: [
            {
              selected_count: 10,
              queued_count: 0,
              sent_count: 9,
              delivered_count: 8,
              failed_count: 1,
              skipped_count: 1,
              opt_out_count: 1,
              inbound_reply_count: 2,
              click_count: 4,
              unique_clicker_count: 3,
              estimated_sms_segments: 10,
              actual_sms_segments: 9,
              estimated_cost_minor: null,
              actual_cost_minor: null,
              currency: 'SEK',
            },
          ],
        };
      },
    };

    await expect(
      getCampaignReport(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
      }),
    ).resolves.toMatchObject({
      selectedCount: 10,
      deliveredCount: 8,
      segmentEstimateDrift: -1,
    });

    if (!statement) {
      throw new Error('Expected getCampaignReport to execute a SQL statement.');
    }

    const query = new PgDialect().sqlToQuery(statement);
    expect(query.sql).toContain('$1::uuid as campaign_id');
    expect(query.sql).toContain('$2::uuid as organization_id');
    expect(query.sql).toContain('"campaign_recipients"."organization_id"');
    expect(query.sql).toContain('"sms_messages"."organization_id"');
    expect(query.sql).toContain('"click_events"."organization_id"');
    expect(query.params.slice(0, 2)).toEqual([
      campaignRow.id,
      campaignRow.organizationId,
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
