import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
import {
  campaignAudienceWhere,
  countCampaignRecipients,
  createAuditLog,
  deleteCampaignDraft,
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
import { campaignRow, recipientRow } from './campaign-fixtures';

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
