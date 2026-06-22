import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
import {
  createManualReplySmsMessage,
  getInboxSummary,
  listInboxConversations,
  markInboxConversationRead,
  markInboxConversationUnread,
  markManualReplyFailed,
  upsertSmsConversationForMessage,
} from '../../src/queries/inbox';
import { smsMessageRow } from './campaign-fixtures';

const organizationId = '22222222-2222-4222-8222-222222222222';
const conversationId = '11111111-1111-4111-8111-111111111111';

describe('inbox query helpers', () => {
  it('upserts minimal conversation state by phone identity', async () => {
    const values = vi.fn(() => ({
      onConflictDoUpdate: () => ({
        returning: () => [
          {
            id: conversationId,
            organizationId,
            phoneHash: 'phone-hash-1',
            normalizedPhone: '+46701111111',
            unreadAt: new Date('2026-05-24T10:00:00.000Z'),
            createdAt: new Date('2026-05-24T10:00:00.000Z'),
            updatedAt: new Date('2026-05-24T10:00:00.000Z'),
          },
        ],
      }),
    }));
    const db = {
      insert: () => ({ values }),
    };

    await expect(
      upsertSmsConversationForMessage(db as never, {
        organizationId,
        phoneHash: 'phone-hash-1',
        normalizedPhone: '+46701111111',
        unreadAt: new Date('2026-05-24T10:00:00.000Z'),
        now: new Date('2026-05-24T10:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      id: conversationId,
      normalizedPhone: '+46701111111',
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        unreadAt: new Date('2026-05-24T10:00:00.000Z'),
        phoneHash: 'phone-hash-1',
        normalizedPhone: '+46701111111',
      }),
    );
  });

  it('maps conversation list rows from the message ledger', async () => {
    const db = {
      execute: async () => ({
        rows: [
          {
            conversation_id: conversationId,
            organization_id: organizationId,
            phone: '+46701111111',
            contact_id: '33333333-3333-4333-8333-333333333333',
            contact_name: 'Ada Lovelace',
            latest_campaign_id: '44444444-4444-4444-8444-444444444444',
            latest_campaign_name: 'Spring reactivation',
            latest_message_direction: 'inbound',
            latest_message_body: 'Can I book tomorrow?',
            latest_message_at: new Date('2026-05-24T10:00:00.000Z'),
            is_unread: true,
            reply_blocked: false,
            reply_blocked_reason: null,
          },
        ],
      }),
    };

    await expect(
      listInboxConversations(db as never, {
        organizationId,
        activity: 'needs_reply',
      }),
    ).resolves.toEqual({
      conversations: [
        expect.objectContaining({
          id: conversationId,
          latestMessageDirection: 'inbound',
          latestMessageBody: 'Can I book tomorrow?',
          isUnread: true,
          replyBlocked: false,
        }),
      ],
    });
  });

  it('resolves conversation contacts by current phone hash matches', async () => {
    let statement: SQL | undefined;
    const db = {
      execute: async (query: SQL) => {
        statement = query;

        return { rows: [] };
      },
    };

    await listInboxConversations(db as never, {
      organizationId,
      activity: 'all',
    });

    if (!statement) {
      throw new Error('Expected listInboxConversations to execute SQL.');
    }

    const query = new PgDialect().sqlToQuery(sql`${statement}`);

    expect(query.sql).toContain('phone_hash_contact');
    expect(query.sql).toContain(
      'phone_hash_contact.phone_hash = conversation_base.phone_hash',
    );
    expect(query.sql).toContain(
      'coalesce(phone_hash_contact.id, latest_messages.contact_id)',
    );
  });

  it('counts unread conversations without loading conversation summaries', async () => {
    let statement: unknown;
    const db = {
      execute: async (query: unknown) => {
        statement = query;

        return { rows: [{ unread_conversation_count: 3 }] };
      },
    };

    await expect(
      getInboxSummary(db as never, { organizationId }),
    ).resolves.toEqual({
      unreadConversationCount: 3,
    });
    expect(statement).toBeDefined();
  });

  it('counts unread conversations from conversation state', async () => {
    let statement: SQL | undefined;
    const db = {
      execute: async (query: SQL) => {
        statement = query;

        return { rows: [{ unread_conversation_count: 1 }] };
      },
    };

    await expect(
      getInboxSummary(db as never, { organizationId }),
    ).resolves.toEqual({
      unreadConversationCount: 1,
    });

    if (!statement) {
      throw new Error('Expected getInboxSummary to execute SQL.');
    }

    const query = new PgDialect().sqlToQuery(sql`${statement}`);

    expect(query.sql).toContain('unread_at');
  });

  it('marks a conversation read by clearing unread state', async () => {
    const set = vi.fn(() => ({
      where: () => ({
        returning: () => [{ id: conversationId }],
      }),
    }));
    const db = {
      execute: async () => {
        return {
          rows: [
            {
              conversation_id: conversationId,
              organization_id: organizationId,
              phone: '+46701111111',
              contact_id: null,
              contact_name: null,
              latest_campaign_id: null,
              latest_campaign_name: null,
              latest_message_direction: 'inbound',
              latest_message_body: 'Yes',
              latest_message_at: new Date('2026-05-24T10:00:00.000Z'),
              is_unread: false,
              reply_blocked: false,
              reply_blocked_reason: null,
            },
          ],
        };
      },
      update: () => ({ set }),
    };

    await expect(
      markInboxConversationRead(db as never, {
        organizationId,
        conversationId,
      }),
    ).resolves.toMatchObject({
      id: conversationId,
      isUnread: false,
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        unreadAt: null,
      }),
    );
  });

  it('marks a conversation unread', async () => {
    const unreadAt = new Date('2026-05-24T10:05:00.000Z');
    const set = vi.fn(() => ({
      where: () => ({
        returning: () => [{ id: conversationId }],
      }),
    }));
    let executeCount = 0;
    const db = {
      execute: async () => {
        executeCount += 1;

        return {
          rows: [
            {
              conversation_id: conversationId,
              organization_id: organizationId,
              phone: '+46701111111',
              contact_id: null,
              contact_name: null,
              latest_campaign_id: null,
              latest_campaign_name: null,
              latest_message_direction: 'outbound',
              latest_message_body: 'See you soon',
              latest_message_at: new Date('2026-05-24T10:00:00.000Z'),
              is_unread: true,
              reply_blocked: false,
              reply_blocked_reason: null,
            },
          ],
        };
      },
      update: () => ({ set }),
    };

    await expect(
      markInboxConversationUnread(db as never, {
        organizationId,
        conversationId,
        now: unreadAt,
      }),
    ).resolves.toMatchObject({
      id: conversationId,
      isUnread: true,
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        unreadAt,
      }),
    );
    expect(executeCount).toBe(1);
  });

  it('creates manual outbound replies with a client idempotency key', async () => {
    const db = {
      insert: () => ({
        values: (value: unknown) => {
          if ('direction' in (value as Record<string, unknown>)) {
            expect(value).toMatchObject({
              organizationId,
              direction: 'outbound',
              createdByUserId: '99999999-9999-4999-8999-999999999999',
              normalizedPhone: '+46701111111',
              phoneHash: 'phone-hash-1',
              idempotencyKey: `manual-reply:${conversationId}:client-1`,
              body: 'Yes, see you tomorrow.',
            });

            return {
              onConflictDoNothing: () => ({
                returning: () => [
                  {
                    ...smsMessageRow,
                    organizationId,
                    direction: 'outbound',
                    campaignId: null,
                    recipientId: null,
                    contactId: null,
                    normalizedPhone: '+46701111111',
                    phoneHash: 'phone-hash-1',
                    idempotencyKey: `manual-reply:${conversationId}:client-1`,
                    body: 'Yes, see you tomorrow.',
                    status: 'queued',
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
      createManualReplySmsMessage(db as never, {
        conversationId,
        organizationId,
        contactId: null,
        createdByUserId: '99999999-9999-4999-8999-999999999999',
        provider: 'fake',
        fromPhone: '+46700000000',
        toPhone: '+46701111111',
        normalizedPhone: '+46701111111',
        phoneHash: 'phone-hash-1',
        body: 'Yes, see you tomorrow.',
        estimatedSegmentCount: 1,
        currency: 'SEK',
        idempotencyKey: `manual-reply:${conversationId}:client-1`,
      }),
    ).resolves.toMatchObject({
      status: 'created',
      message: expect.objectContaining({
        conversationId,
        body: 'Yes, see you tomorrow.',
      }),
    });
  });

  it('marks manual replies failed when provider send is rejected', async () => {
    const set = vi.fn(() => ({
      where: () => ({
        returning: () => [{ ...smsMessageRow, status: 'failed' }],
      }),
    }));
    const db = {
      update: () => ({ set }),
    };
    const failedAt = new Date('2026-05-24T10:10:00.000Z');

    await expect(
      markManualReplyFailed(db as never, {
        organizationId,
        messageId: smsMessageRow.id,
        now: failedAt,
      }),
    ).resolves.toMatchObject({ status: 'failed' });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        failedAt,
      }),
    );
  });
});
