import { describe, expect, it } from 'vitest';
import {
  inboxConversationListQuerySchema,
  inboxConversationListResponseSchema,
  inboxConversationResponseSchema,
  inboxSummaryResponseSchema,
  markInboxConversationReadResponseSchema,
  sendInboxReplyResponseSchema,
  sendInboxReplySchema,
} from '../../src/contracts';

const conversation = {
  id: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  phone: '+46701111111',
  contactId: '33333333-3333-4333-8333-333333333333',
  contactName: 'Ada Lovelace',
  latestCampaignId: '44444444-4444-4444-8444-444444444444',
  latestCampaignName: 'Spring reactivation',
  latestMessageDirection: 'inbound',
  latestMessageBody: 'Can I book tomorrow?',
  latestMessageAt: '2026-05-24T10:00:00.000Z',
  unreadCount: 1,
  replyBlocked: false,
  replyBlockedReason: null,
} as const;

const message = {
  id: '55555555-5555-4555-8555-555555555555',
  conversationId: conversation.id,
  organizationId: conversation.organizationId,
  direction: 'inbound',
  campaignId: conversation.latestCampaignId,
  campaignName: conversation.latestCampaignName,
  body: 'Can I book tomorrow?',
  status: 'received',
  sentAt: null,
  receivedAt: '2026-05-24T10:00:00.000Z',
  deliveredAt: null,
  failedAt: null,
  createdAt: '2026-05-24T10:00:00.000Z',
} as const;

describe('inbox contracts', () => {
  it('validates inbox conversation filters', () => {
    expect(inboxConversationListQuerySchema.parse({})).toEqual({
      activity: 'inbound',
    });
    expect(
      inboxConversationListQuerySchema.parse({ activity: 'unread' }),
    ).toEqual({
      activity: 'unread',
    });
    expect(
      inboxConversationListQuerySchema.safeParse({ activity: 'search' }).success,
    ).toBe(false);
  });

  it('validates conversation list and detail responses', () => {
    expect(
      inboxConversationListResponseSchema.safeParse({
        conversations: [conversation],
      }).success,
    ).toBe(true);
    expect(
      inboxConversationResponseSchema.safeParse({
        conversation,
        messages: [message],
      }).success,
    ).toBe(true);
  });

  it('validates reply requests and responses without provider fields', () => {
    expect(
      sendInboxReplySchema.parse({
        body: '  Yes, see you then.  ',
        clientRequestId: '66666666-6666-4666-8666-666666666666',
      }),
    ).toEqual({
      body: 'Yes, see you then.',
      clientRequestId: '66666666-6666-4666-8666-666666666666',
    });
    expect(
      sendInboxReplySchema.safeParse({
        body: '',
        clientRequestId: '66666666-6666-4666-8666-666666666666',
      }).success,
    ).toBe(false);
    expect(
      sendInboxReplyResponseSchema.safeParse({
        conversation,
        message: { ...message, direction: 'outbound', status: 'queued' },
        providerMessageId: 'SM123',
      }).success,
    ).toBe(false);
  });

  it('validates read and summary responses', () => {
    expect(
      markInboxConversationReadResponseSchema.safeParse({
        conversation: {
          ...conversation,
          unreadCount: 0,
        },
      }).success,
    ).toBe(true);
    expect(
      inboxSummaryResponseSchema.parse({ unreadConversationCount: 2 }),
    ).toEqual({
      unreadConversationCount: 2,
    });
  });
});
