import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
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
import {
  campaignRow,
  clickEventRow,
  messageEventRow,
  recipientRow,
  smsMessageRow,
  trackingLinkRow,
} from './campaign-fixtures';

describe('campaign communication query helpers', () => {
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

  it('creates outbound SMS messages idempotently per campaign recipient', async () => {
    const db = {
      insert: () => ({
        values: (value: Record<string, unknown>) =>
          'direction' in value
            ? {
                onConflictDoNothing: () => ({
                  returning: () => [],
                }),
              }
            : {
                onConflictDoUpdate: () => ({
                  returning: () => [],
                }),
              },
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
        normalizedPhone: '+46701111111',
        phoneHash: 'phone-hash-1',
        idempotencyKey: `campaign-send:${campaignRow.id}:recipient:${recipientRow.id}`,
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
          if ('direction' in (value as Record<string, unknown>)) {
            expect(value).toMatchObject({
              organizationId: campaignRow.organizationId,
              direction: 'inbound',
              provider: 'fake',
              providerMessageId: 'inbound-1',
              fromPhone: '+46701111111',
              toPhone: '+46700000000',
              normalizedPhone: '+46701111111',
              phoneHash: 'phone-hash-1',
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
                    normalizedPhone: '+46701111111',
                    phoneHash: 'phone-hash-1',
                    body: 'STOP',
                    status: 'received',
                    receivedAt: new Date('2026-05-16T10:03:00.000Z'),
                  },
                ],
              }),
            };
          }

          return {
            onConflictDoUpdate: () => ({
              returning: () => [],
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
        normalizedPhone: '+46701111111',
        phoneHash: 'phone-hash-1',
        body: 'STOP',
        receivedAt: new Date('2026-05-16T10:03:00.000Z'),
      }),
    ).resolves.toEqual(expect.objectContaining({ direction: 'inbound' }));
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
});
