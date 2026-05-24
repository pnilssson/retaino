import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createManualReplySmsMessage,
  findSuppressionByHash,
  getInboxConversationById,
  getInboxConversationPhoneIdentity,
  getInboxSummary,
  getOrganizationSmsSender,
  listInboxConversations,
  listInboxMessages,
  markManualReplyFailed,
  markInboxConversationRead,
  recordSmsMessageProviderResult,
} from '@retaino/db';
import {
  assertOrganizationCanSpendSmsCredits,
  debitSmsCreditUsage,
  releaseSmsCreditUsage,
} from '../../../src/features/billing/billing.service';
import {
  getInboxConversation,
  getInboxUnreadSummary,
  listInbox,
  markConversationRead,
  sendInboxReply,
} from '../../../src/features/inbox/inbox.service';
import { createSmsProvider } from '../../../src/lib/sms-provider';

vi.mock('@retaino/db', () => ({
  createManualReplySmsMessage: vi.fn(),
  findSuppressionByHash: vi.fn(),
  getInboxConversationById: vi.fn(),
  getInboxConversationPhoneIdentity: vi.fn(),
  getInboxSummary: vi.fn(),
  getOrganizationSmsSender: vi.fn(),
  listInboxConversations: vi.fn(),
  listInboxMessages: vi.fn(),
  markInboxConversationRead: vi.fn(),
  markManualReplyFailed: vi.fn(),
  recordSmsMessageProviderResult: vi.fn(),
}));

vi.mock('../../../src/features/billing/billing.service', () => ({
  assertOrganizationCanSpendSmsCredits: vi.fn(),
  debitSmsCreditUsage: vi.fn(),
  releaseSmsCreditUsage: vi.fn(),
}));

vi.mock('../../../src/lib/sms-provider', () => ({
  createSmsProvider: vi.fn(),
}));

const db = {} as never;
const organizationId = '22222222-2222-4222-8222-222222222222';
const conversationId = '11111111-1111-4111-8111-111111111111';
const messageId = '33333333-3333-4333-8333-333333333333';
const clientRequestId = '44444444-4444-4444-8444-444444444444';
const phoneHash = 'phone-hash';
const conversation = {
  id: conversationId,
  organizationId,
  phone: '+46701111111',
  contactId: '55555555-5555-4555-8555-555555555555',
  contactName: 'Ada Lovelace',
  latestCampaignId: null,
  latestCampaignName: null,
  latestMessageDirection: 'inbound',
  latestMessageBody: 'Can I book tomorrow?',
  latestMessageAt: '2026-05-24T10:00:00.000Z',
  unreadCount: 1,
  replyBlocked: false,
  replyBlockedReason: null,
} as const;
const message = {
  id: messageId,
  conversationId,
  organizationId,
  direction: 'outbound',
  campaignId: null,
  campaignName: null,
  body: 'Yes, we have one opening.',
  status: 'queued',
  sentAt: null,
  receivedAt: null,
  deliveredAt: null,
  failedAt: null,
  createdAt: '2026-05-24T10:05:00.000Z',
} as const;
const sender = {
  id: '66666666-6666-4666-8666-666666666666',
  organizationId,
  provider: 'fake',
  status: 'ready',
  phoneNumber: '+46700000000',
  countryCode: 'SE',
  numberType: 'mobile',
  providerMessagingServiceId: `fake-ms-${organizationId}`,
  providerPhoneNumberId: 'fake-pn-1',
  regulatoryStatus: 'not_required',
  failureReason: null,
  provisionedAt: '2026-05-18T00:00:00.000Z',
  lastVerifiedAt: '2026-05-18T00:00:00.000Z',
  createdAt: '2026-05-18T00:00:00.000Z',
  updatedAt: '2026-05-18T00:00:00.000Z',
} as const;
const reservedTransactions = [
  {
    transactionType: 'debit',
    credits: -1,
    source: 'manual_reply',
    sourceId: `manual-reply:${conversationId}:${clientRequestId}`,
    creditBucket: 'subscription_period',
    periodStart: '2026-05-01T00:00:00.000Z',
    periodEnd: '2026-06-01T00:00:00.000Z',
    description: 'Inbox SMS reply usage',
    createdAt: '2026-05-24T10:05:00.000Z',
  },
] as const;

describe('inbox service', () => {
  beforeEach(() => {
    vi.mocked(createManualReplySmsMessage).mockReset();
    vi.mocked(findSuppressionByHash).mockReset();
    vi.mocked(getInboxConversationById).mockReset();
    vi.mocked(getInboxConversationPhoneIdentity).mockReset();
    vi.mocked(getInboxSummary).mockReset();
    vi.mocked(getOrganizationSmsSender).mockReset();
    vi.mocked(listInboxConversations).mockReset();
    vi.mocked(listInboxMessages).mockReset();
    vi.mocked(markManualReplyFailed).mockReset();
    vi.mocked(markInboxConversationRead).mockReset();
    vi.mocked(recordSmsMessageProviderResult).mockReset();
    vi.mocked(assertOrganizationCanSpendSmsCredits).mockReset();
    vi.mocked(debitSmsCreditUsage).mockReset();
    vi.mocked(releaseSmsCreditUsage).mockReset();
    vi.mocked(createSmsProvider).mockReset();

    vi.mocked(getInboxConversationById).mockResolvedValue(conversation);
    vi.mocked(getInboxConversationPhoneIdentity).mockResolvedValue({
      phoneHash,
      normalizedPhone: conversation.phone,
    });
    vi.mocked(findSuppressionByHash).mockResolvedValue(null);
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(sender);
    vi.mocked(createManualReplySmsMessage).mockResolvedValue({
      status: 'created',
      message,
    });
    vi.mocked(debitSmsCreditUsage).mockResolvedValue(
      reservedTransactions as never,
    );
    vi.mocked(recordSmsMessageProviderResult).mockResolvedValue(null);
    vi.mocked(createSmsProvider).mockReturnValue({
      name: 'fake',
      listSenderCountries: vi.fn(),
      searchSenderOptions: vi.fn(),
      ensureSender: vi.fn(),
      sendSms: vi.fn().mockResolvedValue({
        provider: 'fake',
        providerMessageId: 'fake-message-1',
        normalizedStatus: 'queued',
        providerStatus: 'queued',
        providerSenderReference: sender.providerMessagingServiceId,
        actualSegments: 1,
        cost: '0',
        currency: 'SEK',
        rawProviderReference: 'fake-message-1',
      }),
      parseStatusWebhook: vi.fn(),
      parseInboundWebhook: vi.fn(),
      verifyWebhook: vi.fn(),
    });
  });

  it('lists conversations, details, summaries, and read state through scoped queries', async () => {
    vi.mocked(listInboxConversations).mockResolvedValue({
      conversations: [conversation],
    });
    vi.mocked(listInboxMessages).mockResolvedValue({ messages: [message] });
    vi.mocked(getInboxSummary).mockResolvedValue({
      unreadConversationCount: 1,
    });
    vi.mocked(markInboxConversationRead).mockResolvedValue({
      ...conversation,
      unreadCount: 0,
    });

    await expect(
      listInbox({ db, organizationId, activity: 'inbound' }),
    ).resolves.toEqual({ conversations: [conversation] });
    await expect(
      getInboxConversation({ db, organizationId, conversationId }),
    ).resolves.toEqual({ conversation, messages: [message] });
    await expect(
      getInboxUnreadSummary({ db, organizationId }),
    ).resolves.toEqual({ unreadConversationCount: 1 });
    await expect(
      markConversationRead({ db, organizationId, conversationId }),
    ).resolves.toEqual({
      conversation: { ...conversation, unreadCount: 0 },
    });

    expect(listInboxConversations).toHaveBeenCalledWith(db, {
      organizationId,
      activity: 'inbound',
    });
    expect(listInboxMessages).toHaveBeenCalledWith(db, {
      organizationId,
      conversationId,
    });
    expect(markInboxConversationRead).toHaveBeenCalledWith(db, {
      organizationId,
      conversationId,
    });
  });

  it('sends a manual reply, debits credits, and records provider result', async () => {
    await expect(sendReply()).resolves.toMatchObject({
      status: 'sent',
      response: {
        conversation,
        message,
      },
    });

    expect(assertOrganizationCanSpendSmsCredits).toHaveBeenCalledWith({
      db,
      organizationId,
      estimatedSegments: 1,
    });
    expect(createManualReplySmsMessage).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        conversationId,
        organizationId,
        contactId: conversation.contactId,
        fromPhone: sender.phoneNumber,
        toPhone: conversation.phone,
        normalizedPhone: conversation.phone,
        phoneHash,
        body: message.body,
        idempotencyKey: `manual-reply:${conversationId}:${clientRequestId}`,
      }),
    );
    expect(debitSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      actualSegments: 1,
      source: 'manual_reply',
      sourceId: `manual-reply:${conversationId}:${clientRequestId}`,
      description: 'Inbox SMS reply usage',
    });
    const provider = vi.mocked(createSmsProvider).mock.results[0]?.value;
    expect(provider.sendSms).toHaveBeenCalledWith(
      expect.objectContaining({
        retainoMessageId: messageId,
        organizationSender: sender,
        to: conversation.phone,
        renderedBody: message.body,
        reference: `manual-reply:${conversationId}:${clientRequestId}`,
      }),
    );
    expect(recordSmsMessageProviderResult).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        organizationId,
        messageId,
        providerMessageId: 'fake-message-1',
        status: 'queued',
      }),
    );
  });

  it('does not send when the conversation is missing, suppressed, or sender is not ready', async () => {
    vi.mocked(getInboxConversationById).mockResolvedValueOnce(null);
    await expect(sendReply()).resolves.toEqual({ status: 'not_found' });

    vi.mocked(getInboxConversationById).mockResolvedValue(conversation);
    vi.mocked(findSuppressionByHash).mockResolvedValue({
      id: '77777777-7777-4777-8777-777777777777',
      organizationId,
      type: 'phone',
      value: conversation.phone,
      normalizedValue: conversation.phone,
      valueHash: phoneHash,
      reason: 'stop_reply',
      source: 'recipient_reply',
      createdAt: new Date('2026-05-24T10:01:00.000Z'),
    });
    await expect(sendReply()).resolves.toEqual({ status: 'reply_blocked' });

    vi.mocked(findSuppressionByHash).mockResolvedValue(null);
    vi.mocked(getOrganizationSmsSender).mockResolvedValue({
      ...sender,
      providerMessagingServiceId: null,
    });
    await expect(sendReply()).resolves.toEqual({ status: 'sender_not_ready' });

    const provider = vi.mocked(createSmsProvider).mock.results.at(-1)?.value;
    expect(provider?.sendSms).not.toHaveBeenCalled();
  });

  it('does not send again for an idempotent existing reply row', async () => {
    vi.mocked(createManualReplySmsMessage).mockResolvedValue({
      status: 'existing',
      message,
    });

    await expect(sendReply()).resolves.toMatchObject({
      status: 'sent',
      response: { message },
    });

    expect(debitSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      actualSegments: 1,
      source: 'manual_reply',
      sourceId: `manual-reply:${conversationId}:${clientRequestId}`,
      description: 'Inbox SMS reply usage',
    });
    const provider = vi.mocked(createSmsProvider).mock.results[0]?.value;
    expect(provider.sendSms).not.toHaveBeenCalled();
    expect(recordSmsMessageProviderResult).not.toHaveBeenCalled();
  });

  it('does not create a queued reply row when credit reservation fails', async () => {
    const creditError = new Error('SMS credit balance is too low.');
    vi.mocked(debitSmsCreditUsage).mockRejectedValue(creditError);

    await expect(sendReply()).rejects.toThrow(creditError);

    expect(createManualReplySmsMessage).not.toHaveBeenCalled();
    const provider = vi.mocked(createSmsProvider).mock.results[0]?.value;
    expect(provider.sendSms).not.toHaveBeenCalled();
    expect(releaseSmsCreditUsage).not.toHaveBeenCalled();
  });

  it('releases credits when provider send fails after reservation', async () => {
    const providerError = new Error('Provider timeout.');
    vi.mocked(createSmsProvider).mockReturnValue({
      name: 'fake',
      listSenderCountries: vi.fn(),
      searchSenderOptions: vi.fn(),
      ensureSender: vi.fn(),
      sendSms: vi.fn().mockRejectedValue(providerError),
      parseStatusWebhook: vi.fn(),
      parseInboundWebhook: vi.fn(),
      verifyWebhook: vi.fn(),
    });

    await expect(sendReply()).rejects.toThrow(providerError);

    expect(releaseSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      reservedTransactions,
      source: 'manual_reply',
      sourceId: `manual-reply:${conversationId}:${clientRequestId}:release`,
      description: 'Inbox SMS reply release',
    });
    expect(markManualReplyFailed).toHaveBeenCalledWith(db, {
      organizationId,
      messageId,
    });
    expect(recordSmsMessageProviderResult).not.toHaveBeenCalled();
  });

  it('does not release credits when provider result recording fails after send', async () => {
    const recordError = new Error('Database write failed.');
    vi.mocked(recordSmsMessageProviderResult).mockRejectedValue(recordError);

    await expect(sendReply()).rejects.toThrow(recordError);

    const provider = vi.mocked(createSmsProvider).mock.results[0]?.value;
    expect(provider.sendSms).toHaveBeenCalled();
    expect(releaseSmsCreditUsage).not.toHaveBeenCalled();
    expect(markManualReplyFailed).not.toHaveBeenCalled();
  });
});

function sendReply() {
  return sendInboxReply({
    db,
    env: {
      SMS_SENDING_MODE: 'test',
      TWILIO_STATUS_CALLBACK_BASE_URL: 'https://api.retaino.test',
    } as never,
    organizationId,
    conversationId,
    reply: {
      body: message.body,
      clientRequestId,
    },
  });
}
