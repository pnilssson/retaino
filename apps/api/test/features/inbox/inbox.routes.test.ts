import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inboxRoutes } from '../../../src/features/inbox/inbox.routes';
import {
  BillingInsufficientCreditsError,
  BillingSubscriptionRequiredError,
} from '../../../src/features/billing/billing.service';
import {
  getInboxConversation,
  getInboxUnreadSummary,
  listInbox,
  markConversationRead,
  sendInboxReply,
} from '../../../src/features/inbox/inbox.service';
import { SmsProviderError } from '../../../src/lib/sms-provider';
import type { AppEnv } from '../../../src/types';

vi.mock('../../../src/features/inbox/inbox.service', () => ({
  getInboxConversation: vi.fn(),
  getInboxUnreadSummary: vi.fn(),
  listInbox: vi.fn(),
  markConversationRead: vi.fn(),
  sendInboxReply: vi.fn(),
}));

vi.mock('../../../src/features/organization/organization.gates', () => ({
  requireCampaignEligibility: vi.fn().mockResolvedValue({ ok: true }),
}));

const organizationId = '22222222-2222-4222-8222-222222222222';
const conversationId = '11111111-1111-4111-8111-111111111111';
const conversation = {
  id: conversationId,
  organizationId,
  phone: '+46701111111',
  contactId: null,
  contactName: null,
  latestCampaignId: null,
  latestCampaignName: null,
  latestMessageDirection: 'inbound',
  latestMessageBody: 'Yes',
  latestMessageAt: '2026-05-24T10:00:00.000Z',
  unreadCount: 1,
  replyBlocked: false,
  replyBlockedReason: null,
} as const;
const message = {
  id: '33333333-3333-4333-8333-333333333333',
  conversationId,
  organizationId,
  direction: 'inbound',
  campaignId: null,
  campaignName: null,
  body: 'Yes',
  status: 'received',
  sentAt: null,
  receivedAt: '2026-05-24T10:00:00.000Z',
  deliveredAt: null,
  failedAt: null,
  createdAt: '2026-05-24T10:00:00.000Z',
} as const;

function testApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    c.set('organization', {
      id: organizationId,
      clerkOrganizationId: 'org_123',
      name: 'Retaino Test',
      slug: 'retaino-test',
      onboardingStatus: 'complete',
      role: 'org:admin',
    });
    c.set('user', {
      id: '44444444-4444-4444-8444-444444444444',
      clerkUserId: 'user_123',
      email: 'ada@example.com',
      createdAt: '2026-05-24T10:00:00.000Z',
      updatedAt: '2026-05-24T10:00:00.000Z',
    });
    await next();
  });
  app.route('/v1/inbox', inboxRoutes);

  return app;
}

describe('inbox routes', () => {
  beforeEach(() => {
    vi.mocked(getInboxConversation).mockReset();
    vi.mocked(getInboxUnreadSummary).mockReset();
    vi.mocked(listInbox).mockReset();
    vi.mocked(markConversationRead).mockReset();
    vi.mocked(sendInboxReply).mockReset();
  });

  it('lists conversations using the requested activity filter', async () => {
    vi.mocked(listInbox).mockResolvedValue({ conversations: [conversation] });

    const response = await testApp().request(
      '/v1/inbox/conversations?activity=needs_reply',
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      conversations: [conversation],
    });
    expect(listInbox).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        activity: 'needs_reply',
      }),
    );
  });

  it('rejects the removed unread activity filter', async () => {
    const response = await testApp().request(
      '/v1/inbox/conversations?activity=unread',
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: 'Invalid inbox filter.' },
    });
    expect(listInbox).not.toHaveBeenCalled();
  });

  it('loads conversation detail and unread summary', async () => {
    vi.mocked(getInboxConversation).mockResolvedValue({
      conversation,
      messages: [message],
    });
    vi.mocked(getInboxUnreadSummary).mockResolvedValue({
      unreadConversationCount: 1,
    });

    const detailResponse = await testApp().request(
      `/v1/inbox/conversations/${conversationId}`,
    );
    const summaryResponse = await testApp().request('/v1/inbox/summary');

    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toEqual({
      conversation,
      messages: [message],
    });
    expect(summaryResponse.status).toBe(200);
    await expect(summaryResponse.json()).resolves.toEqual({
      unreadConversationCount: 1,
    });
  });

  it('marks a conversation read', async () => {
    vi.mocked(markConversationRead).mockResolvedValue({
      conversation: { ...conversation, unreadCount: 0 },
    });

    const response = await testApp().request(
      `/v1/inbox/conversations/${conversationId}/read`,
      { method: 'POST' },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      conversation: { ...conversation, unreadCount: 0 },
    });
  });

  it('sends replies through the service', async () => {
    vi.mocked(sendInboxReply).mockResolvedValue({
      status: 'sent',
      response: {
        conversation,
        message: { ...message, direction: 'outbound', status: 'queued' },
      },
    });

    const response = await testApp().request(
      `/v1/inbox/conversations/${conversationId}/replies`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          body: 'See you tomorrow.',
          clientRequestId: '55555555-5555-4555-8555-555555555555',
        }),
      },
    );

    expect(response.status).toBe(201);
    expect(sendInboxReply).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        conversationId,
        reply: {
          body: 'See you tomorrow.',
          clientRequestId: '55555555-5555-4555-8555-555555555555',
        },
      }),
    );
  });

  it.each([
    {
      name: 'blocked phone',
      result: { status: 'reply_blocked' } as const,
      status: 409,
      message: 'This phone number cannot receive replies.',
    },
    {
      name: 'sender not ready',
      result: { status: 'sender_not_ready' } as const,
      status: 409,
      message: 'Set up the SMS sender before replying.',
    },
  ])('maps reply service failures for $name', async (example) => {
    vi.mocked(sendInboxReply).mockResolvedValue(example.result);

    const response = await replyRequest();

    expect(response.status).toBe(example.status);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: example.message },
    });
  });

  it.each([
    {
      name: 'missing subscription',
      error: new BillingSubscriptionRequiredError(),
      status: 403,
      message: 'An active subscription is required before sending SMS.',
    },
    {
      name: 'insufficient credits',
      error: new BillingInsufficientCreditsError({
        balance: 0,
        requiredCredits: 1,
      }),
      status: 409,
      message: 'SMS credit balance is too low.',
    },
    {
      name: 'provider failure',
      error: new SmsProviderError({
        code: 'provider_temporary_failure',
        retryable: true,
        publicMessage: 'The SMS provider is temporarily unavailable.',
      }),
      status: 502,
      message: 'The SMS provider is temporarily unavailable.',
    },
  ])('maps reply exceptions for $name', async (example) => {
    vi.mocked(sendInboxReply).mockRejectedValue(example.error);

    const response = await replyRequest();

    expect(response.status).toBe(example.status);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: example.message },
    });
  });
});

function replyRequest() {
  return testApp().request(
    `/v1/inbox/conversations/${conversationId}/replies`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        body: 'See you tomorrow.',
        clientRequestId: '55555555-5555-4555-8555-555555555555',
      }),
    },
  );
}
