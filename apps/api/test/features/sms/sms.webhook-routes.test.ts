import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createInboundSmsMessage,
  getLatestCampaignRecipientByPhoneHash,
  getOrganizationSmsSenderByProviderReference,
  getSmsMessageByProviderMessageId,
  recordCampaignMessageEvent,
  recordSmsMessageProviderResult,
  upsertSuppressionByHash,
} from '@retaino/db';
import { twilioMessagingWebhookRoutes } from '../../../src/features/sms/sms.webhook-routes';
import { createSmsProvider } from '../../../src/lib/sms-provider';
import type { AppEnv } from '../../../src/types';

vi.mock('@retaino/db', () => ({
  createInboundSmsMessage: vi.fn(),
  getLatestCampaignRecipientByPhoneHash: vi.fn(),
  getOrganizationSmsSenderByProviderReference: vi.fn(),
  getSmsMessageByProviderMessageId: vi.fn(),
  recordCampaignMessageEvent: vi.fn(),
  recordSmsMessageProviderResult: vi.fn(),
  upsertSuppressionByHash: vi.fn(),
}));

vi.mock('../../../src/lib/sms-provider', () => ({
  createSmsProvider: vi.fn(),
}));

const organizationId = '22222222-2222-4222-8222-222222222222';
const campaignId = '33333333-3333-4333-8333-333333333333';
const recipientId = '44444444-4444-4444-8444-444444444444';
const messageId = '55555555-5555-4555-8555-555555555555';

function testApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    await next();
  });
  app.route('/v1/webhooks/twilio/messaging', twilioMessagingWebhookRoutes);
  return app;
}

describe('twilioMessagingWebhookRoutes', () => {
  beforeEach(() => {
    vi.mocked(createInboundSmsMessage).mockReset();
    vi.mocked(getLatestCampaignRecipientByPhoneHash).mockReset();
    vi.mocked(getOrganizationSmsSenderByProviderReference).mockReset();
    vi.mocked(getSmsMessageByProviderMessageId).mockReset();
    vi.mocked(recordCampaignMessageEvent).mockReset();
    vi.mocked(recordSmsMessageProviderResult).mockReset();
    vi.mocked(upsertSuppressionByHash).mockReset();
    vi.mocked(createSmsProvider).mockReset();

    vi.mocked(createSmsProvider).mockReturnValue({
      name: 'twilio',
      listSenderCountries: vi.fn(),
      searchSenderOptions: vi.fn(),
      ensureSender: vi.fn(),
      sendSms: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(true),
      parseStatusWebhook: vi.fn().mockResolvedValue({
        providerMessageId: 'SM123',
        retainoMessageReference: null,
        normalizedStatus: 'delivered',
        providerStatus: 'delivered',
        occurredAt: new Date('2026-05-16T10:04:00.000Z'),
        actualSegments: 1,
        cost: '0.08',
        currency: 'SEK',
        providerErrorCode: null,
        providerErrorMessage: null,
        rawProviderReference: 'SM123',
      }),
      parseInboundWebhook: vi.fn().mockResolvedValue({
        providerMessageId: 'IM123',
        from: '+46701111111',
        to: '+46700000000',
        body: 'STOP',
        receivedAt: new Date('2026-05-16T10:05:00.000Z'),
        providerSenderReference: 'MG123',
        rawProviderReference: 'IM123',
      }),
    });
  });

  it('validates and records status callbacks without Clerk auth', async () => {
    vi.mocked(getSmsMessageByProviderMessageId).mockResolvedValue({
      id: messageId,
      organizationId,
      direction: 'outbound',
      campaignId,
      recipientId,
      contactId: null,
      provider: 'twilio',
      providerMessageId: 'SM123',
      providerMessagingServiceId: 'MG123',
      providerPhoneNumberId: 'PN123',
      fromPhone: '+46700000000',
      toPhone: '+46701111111',
      body: 'Hi Ada',
      status: 'queued',
      estimatedSegmentCount: 1,
      actualSegmentCount: null,
      estimatedCostMinor: null,
      actualCostMinor: null,
      currency: 'SEK',
      queuedAt: '2026-05-16T10:00:00.000Z',
      sentAt: null,
      receivedAt: null,
      deliveredAt: null,
      failedAt: null,
      createdAt: '2026-05-16T10:00:00.000Z',
      updatedAt: '2026-05-16T10:00:00.000Z',
    });

    const response = await testApp().request(
      '/v1/webhooks/twilio/messaging/status',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-twilio-signature': 'valid',
        },
        body: 'MessageSid=SM123&MessageStatus=delivered',
      },
    );

    expect(response.status).toBe(200);
    expect(recordCampaignMessageEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId,
        campaignId,
        messageId,
        recipientId,
        eventType: 'delivered',
      }),
    );
    expect(recordSmsMessageProviderResult).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId,
        messageId,
        status: 'delivered',
        actualSegmentCount: 1,
      }),
    );
  });

  it('stores inbound STOP replies and creates phone suppressions', async () => {
    vi.mocked(getOrganizationSmsSenderByProviderReference).mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      organizationId,
      provider: 'twilio',
      status: 'ready',
      phoneNumber: '+46700000000',
      countryCode: 'SE',
      numberType: 'mobile',
      providerMessagingServiceId: 'MG123',
      providerPhoneNumberId: 'PN123',
      regulatoryStatus: null,
      failureReason: null,
      provisionedAt: null,
      lastVerifiedAt: null,
      createdAt: '2026-05-16T10:00:00.000Z',
      updatedAt: '2026-05-16T10:00:00.000Z',
    });
    vi.mocked(getLatestCampaignRecipientByPhoneHash).mockResolvedValue({
      id: recipientId,
      organizationId,
      campaignId,
      contactId: '77777777-7777-4777-8777-777777777777',
      status: 'sent',
      exclusionReason: null,
      name: 'Ada Lovelace',
      phone: '+46701111111',
      email: null,
      lastBookingAt: null,
      lastContactedAt: null,
      selectedAt: '2026-05-16T10:00:00.000Z',
      queuedAt: '2026-05-16T10:00:00.000Z',
      sentAt: '2026-05-16T10:02:00.000Z',
      failedAt: null,
      createdAt: '2026-05-16T10:00:00.000Z',
      updatedAt: '2026-05-16T10:02:00.000Z',
    });
    vi.mocked(createInboundSmsMessage).mockResolvedValue({
      id: messageId,
      organizationId,
      direction: 'inbound',
      campaignId,
      recipientId,
      contactId: '77777777-7777-4777-8777-777777777777',
      provider: 'twilio',
      providerMessageId: 'IM123',
      providerMessagingServiceId: 'MG123',
      providerPhoneNumberId: null,
      fromPhone: '+46701111111',
      toPhone: '+46700000000',
      body: 'STOP',
      status: 'received',
      estimatedSegmentCount: 0,
      actualSegmentCount: null,
      estimatedCostMinor: null,
      actualCostMinor: null,
      currency: null,
      queuedAt: null,
      sentAt: null,
      receivedAt: '2026-05-16T10:05:00.000Z',
      deliveredAt: null,
      failedAt: null,
      createdAt: '2026-05-16T10:05:00.000Z',
      updatedAt: '2026-05-16T10:05:00.000Z',
    });

    const response = await testApp().request(
      '/v1/webhooks/twilio/messaging/inbound',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-twilio-signature': 'valid',
        },
        body: 'MessageSid=IM123&From=%2B46701111111&To=%2B46700000000&Body=STOP',
      },
    );

    expect(response.status).toBe(200);
    expect(createInboundSmsMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId,
        provider: 'twilio',
        providerMessageId: 'IM123',
        campaignId,
        recipientId,
      }),
    );
    expect(getLatestCampaignRecipientByPhoneHash).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId,
      }),
    );
    expect(upsertSuppressionByHash).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId,
        type: 'phone',
        value: '+46701111111',
        normalizedValue: '+46701111111',
        reason: 'provider_opt_out',
        source: 'twilio',
      }),
    );
    expect(recordCampaignMessageEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId,
        campaignId,
        messageId,
        recipientId,
        eventType: 'opt_out',
      }),
    );
  });
});
