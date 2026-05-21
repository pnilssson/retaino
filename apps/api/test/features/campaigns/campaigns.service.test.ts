import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAuditLog,
  createOutboundSmsMessage,
  findSuppressionByHash,
  getCampaignById,
  getCurrentLegalBundle,
  getCurrentOrganizationLegalAcceptance,
  getOrganizationProfileByOrganizationId,
  getOrganizationSmsSender,
  listSelectedCampaignRecipientsForSend,
  markCampaignRecipientSent,
  markCampaignRecipientSkipped,
  markCampaignSendCompleted,
  markCampaignSendFailed,
  recordSmsMessageProviderResult,
  startCampaignSend,
  upsertTrackingLink,
} from '@retaino/db';
import {
  debitSmsCreditUsage,
  releaseSmsCreditUsage,
} from '../../../src/features/billing/billing.service';
import {
  processCampaignSend,
  sendCampaignTestSms,
} from '../../../src/features/campaigns/campaigns.service';
import { createSmsProvider } from '../../../src/lib/sms-provider';

vi.mock('@retaino/db', () => ({
  createAuditLog: vi.fn(),
  createOutboundSmsMessage: vi.fn(),
  findSuppressionByHash: vi.fn(),
  getCampaignById: vi.fn(),
  getCurrentLegalBundle: vi.fn(),
  getCurrentOrganizationLegalAcceptance: vi.fn(),
  getOrganizationProfileByOrganizationId: vi.fn(),
  getOrganizationSmsSender: vi.fn(),
  listSelectedCampaignRecipientsForSend: vi.fn(),
  markCampaignRecipientSent: vi.fn(),
  markCampaignRecipientSkipped: vi.fn(),
  markCampaignSendCompleted: vi.fn(),
  markCampaignSendFailed: vi.fn(),
  recordSmsMessageProviderResult: vi.fn(),
  startCampaignSend: vi.fn(),
  upsertTrackingLink: vi.fn(),
}));

vi.mock('../../../src/features/billing/billing.service', () => ({
  debitSmsCreditUsage: vi.fn(),
  releaseSmsCreditUsage: vi.fn(),
}));

vi.mock('../../../src/lib/sms-provider', () => ({
  createSmsProvider: vi.fn(),
}));

const organizationId = '22222222-2222-4222-8222-222222222222';
const campaignId = '44444444-4444-4444-8444-444444444444';
const userId = '11111111-1111-4111-8111-111111111111';
const db = {} as never;

const campaign = {
  id: campaignId,
  organizationId,
  createdByUserId: userId,
  name: 'June reactivation',
  status: 'ready_to_send',
  audienceRule: { lapsedDays: 90, includeNoBookingDate: false },
  smsBody: 'Hi {first_name}, we have openings this week.',
  bookingUrl: 'https://booking.example.com/studio',
  campaignCode: null,
  attributionWindowDays: 7,
  readyToSendAt: '2026-05-16T10:00:00.000Z',
  readyToSendByUserId: userId,
  sendStartedAt: null,
  sentAt: null,
  failedAt: null,
  failureReason: null,
  reservedCreditCount: null,
  actualCreditCount: null,
  createdAt: '2026-05-16T00:00:00.000Z',
  updatedAt: '2026-05-16T10:00:00.000Z',
} as const;

const recipient = {
  id: '55555555-5555-4555-8555-555555555555',
  organizationId,
  campaignId,
  contactId: '66666666-6666-4666-8666-666666666666',
  status: 'selected',
  exclusionReason: null,
  name: 'Ada Lovelace',
  phone: '+46701111111',
  email: 'ada@example.com',
  normalizedPhone: '+46701111111',
  normalizedEmail: 'ada@example.com',
  phoneHash: 'phone-hash',
  emailHash: 'email-hash',
  lastBookingAt: '2026-01-01T00:00:00.000Z',
  lastContactedAt: null,
  selectedAt: '2026-05-16T10:00:00.000Z',
} as const;

const sender = {
  id: '77777777-7777-4777-8777-777777777777',
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

const legalBundle = {
  version: '2026-05-09',
  hash: 'f'.repeat(64),
  documents: [],
};

const legalAcceptance = {
  id: '88888888-8888-4888-8888-888888888888',
  organizationId,
  userId,
  bundleVersion: legalBundle.version,
  bundleHash: legalBundle.hash,
  documentsSnapshot: [],
  ipAddress: null,
  userAgent: null,
  acceptedAt: '2026-05-08T00:00:00.000Z',
  acceptedByEmail: 'ada@retaino.test',
};

describe('campaign send service', () => {
  beforeEach(() => {
    vi.mocked(createAuditLog).mockReset();
    vi.mocked(createOutboundSmsMessage).mockReset();
    vi.mocked(findSuppressionByHash).mockReset();
    vi.mocked(getCampaignById).mockReset();
    vi.mocked(getCurrentLegalBundle).mockReset();
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockReset();
    vi.mocked(getOrganizationProfileByOrganizationId).mockReset();
    vi.mocked(getOrganizationSmsSender).mockReset();
    vi.mocked(listSelectedCampaignRecipientsForSend).mockReset();
    vi.mocked(markCampaignRecipientSent).mockReset();
    vi.mocked(markCampaignRecipientSkipped).mockReset();
    vi.mocked(markCampaignSendCompleted).mockReset();
    vi.mocked(markCampaignSendFailed).mockReset();
    vi.mocked(recordSmsMessageProviderResult).mockReset();
    vi.mocked(startCampaignSend).mockReset();
    vi.mocked(upsertTrackingLink).mockReset();
    vi.mocked(debitSmsCreditUsage).mockReset();
    vi.mocked(releaseSmsCreditUsage).mockReset();
    vi.mocked(createSmsProvider).mockReset();

    vi.mocked(getCampaignById).mockResolvedValue(campaign);
    vi.mocked(getCurrentLegalBundle).mockResolvedValue(legalBundle);
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockResolvedValue(
      legalAcceptance,
    );
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue({
      id: '99999999-9999-4999-8999-999999999999',
      organizationId,
      legalName: 'Retaino AB',
      registrationNumber: '559000-0000',
      billingEmail: 'billing@retaino.test',
      responsibleName: 'Ada Lovelace',
      responsibleEmail: 'ada@retaino.test',
      responsiblePhone: '+46700000000',
      countryCode: 'SE',
      createdAt: '2026-05-05T00:00:00.000Z',
      updatedAt: '2026-05-05T00:00:00.000Z',
    });
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(sender);
    vi.mocked(listSelectedCampaignRecipientsForSend).mockResolvedValue({
      recipients: [recipient],
    });
    vi.mocked(upsertTrackingLink).mockResolvedValue({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      organizationId,
      campaignId,
      recipientId: recipient.id,
      code: 'abc123',
      targetUrl: campaign.bookingUrl,
      createdAt: '2026-05-16T10:00:00.000Z',
      updatedAt: '2026-05-16T10:00:00.000Z',
    });
    vi.mocked(debitSmsCreditUsage).mockResolvedValue([
      {
        transactionType: 'debit',
        credits: -1,
        source: 'campaign_send',
        sourceId: `campaign-send:${campaignId}`,
        creditBucket: 'subscription_period',
        periodStart: '2026-05-01T00:00:00.000Z',
        periodEnd: '2026-06-01T00:00:00.000Z',
        description: 'Campaign SMS reservation',
        createdAt: '2026-05-16T10:00:00.000Z',
      },
    ]);
    vi.mocked(startCampaignSend).mockResolvedValue({
      status: 'started',
      campaign: { ...campaign, status: 'sending' },
    });
    vi.mocked(createOutboundSmsMessage).mockResolvedValue({
      status: 'created',
      message: {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        organizationId,
        direction: 'outbound',
        campaignId,
        recipientId: recipient.id,
        contactId: recipient.contactId,
        provider: 'fake',
        providerMessageId: null,
        providerMessagingServiceId: null,
        providerPhoneNumberId: null,
        fromPhone: sender.phoneNumber,
        toPhone: recipient.normalizedPhone,
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
      },
    });
    vi.mocked(recordSmsMessageProviderResult).mockResolvedValue(null);
    vi.mocked(markCampaignRecipientSent).mockResolvedValue(null);
    vi.mocked(markCampaignSendCompleted).mockResolvedValue({
      ...campaign,
      status: 'sent',
      sentAt: '2026-05-16T10:05:00.000Z',
      actualCreditCount: 1,
    });
    vi.mocked(markCampaignSendFailed).mockResolvedValue({
      ...campaign,
      status: 'failed',
      failedAt: '2026-05-16T10:05:00.000Z',
      failureReason: 'Provider send failed.',
      actualCreditCount: 0,
    });
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

  it('sends campaign test SMS through the provider and reserves credits', async () => {
    await expect(
      sendCampaignTestSms({
        db,
        env: {
          SMS_SENDING_MODE: 'test',
          TWILIO_STATUS_CALLBACK_BASE_URL: 'https://api.retaino.test',
        } as never,
        organizationId,
        campaignId,
        testPhone: '0700000000',
      }),
    ).resolves.toMatchObject({
      status: 'sent',
      testSend: {
        to: '+46700000000',
        chargedCredits: 1,
        status: 'queued',
      },
    });

    expect(debitSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      actualSegments: 1,
      source: 'campaign_test_send',
      sourceId: expect.stringMatching(/^campaign-test:/),
      description: 'Campaign test SMS usage',
    });
    const provider = vi.mocked(createSmsProvider).mock.results[0]?.value;
    expect(provider.sendSms).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationSender: sender,
        to: '+46700000000',
        estimatedSegments: 1,
      }),
    );
  });

  it('releases test SMS credits when the provider send fails', async () => {
    const providerError = new Error('Provider rejected the test SMS.');
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

    await expect(
      sendCampaignTestSms({
        db,
        env: { SMS_SENDING_MODE: 'test' } as never,
        organizationId,
        campaignId,
        testPhone: '0700000000',
      }),
    ).rejects.toThrow(providerError);

    expect(releaseSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      reservedTransactions: expect.any(Array),
      source: 'campaign_test_send',
      sourceId: expect.stringMatching(/^campaign-test:.*:release$/),
      description: 'Campaign test SMS release',
    });
  });

  it('creates tracking links and records provider send results', async () => {
    await processCampaignSend({
      db,
      env: {
        DATABASE_URL: 'postgres://retaino.test/db',
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      } as never,
      organizationId,
      campaignId,
      userId,
    });

    expect(debitSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      actualSegments: 1,
      source: 'campaign_send',
      sourceId: `campaign-send:${campaignId}`,
      description: 'Campaign SMS reservation',
    });
    expect(startCampaignSend).toHaveBeenCalledWith(db, {
      organizationId,
      campaignId,
      reservedCreditCount: 1,
    });
    expect(upsertTrackingLink).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        organizationId,
        campaignId,
        recipientId: recipient.id,
        targetUrl: campaign.bookingUrl,
      }),
    );
    expect(createOutboundSmsMessage).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        organizationId,
        campaignId,
        recipientId: recipient.id,
        toPhone: recipient.normalizedPhone,
        body: expect.stringContaining('https://go.retaino.test/r/abc123'),
      }),
    );
    const provider = vi.mocked(createSmsProvider).mock.results[0]?.value;
    expect(provider.sendSms).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationSender: sender,
        to: recipient.normalizedPhone,
        renderedBody: expect.stringContaining('Reply STOP to opt out'),
      }),
    );
    expect(recordSmsMessageProviderResult).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        messageId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        providerMessageId: 'fake-message-1',
        actualSegmentCount: 1,
      }),
    );
    expect(markCampaignRecipientSent).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        organizationId,
        recipientId: recipient.id,
      }),
    );
    expect(markCampaignSendCompleted).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        organizationId,
        campaignId,
        actualCreditCount: 1,
      }),
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        organizationId,
        actorUserId: userId,
        eventType: 'campaign.sent',
      }),
    );
    expect(
      vi.mocked(createAuditLog).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(markCampaignSendCompleted).mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('does not send again for recipients already sent by a retry', async () => {
    vi.mocked(getCampaignById).mockResolvedValue({
      ...campaign,
      status: 'sending',
      reservedCreditCount: 1,
      sendStartedAt: '2026-05-16T10:01:00.000Z',
    });
    vi.mocked(createOutboundSmsMessage).mockResolvedValue({
      status: 'existing',
      message: {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        organizationId,
        direction: 'outbound',
        campaignId,
        recipientId: recipient.id,
        contactId: recipient.contactId,
        provider: 'fake',
        providerMessageId: 'fake-message-1',
        providerMessagingServiceId: sender.providerMessagingServiceId,
        providerPhoneNumberId: sender.providerPhoneNumberId,
        fromPhone: sender.phoneNumber,
        toPhone: recipient.normalizedPhone,
        body: 'Hi Ada',
        status: 'queued',
        estimatedSegmentCount: 1,
        actualSegmentCount: 1,
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
      },
    });

    await processCampaignSend({
      db,
      env: {
        DATABASE_URL: 'postgres://retaino.test/db',
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      } as never,
      organizationId,
      campaignId,
      userId,
    });

    expect(debitSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      actualSegments: 1,
      source: 'campaign_send',
      sourceId: `campaign-send:${campaignId}`,
      description: 'Campaign SMS reservation',
    });
    const provider = vi.mocked(createSmsProvider).mock.results[0]?.value;
    expect(provider.sendSms).not.toHaveBeenCalled();
    expect(markCampaignRecipientSent).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        organizationId,
        recipientId: recipient.id,
      }),
    );
  });

  it('fails unresolved existing message attempts instead of sending twice', async () => {
    vi.mocked(getCampaignById).mockResolvedValue({
      ...campaign,
      status: 'sending',
      reservedCreditCount: 1,
      sendStartedAt: '2026-05-16T10:01:00.000Z',
    });
    vi.mocked(createOutboundSmsMessage).mockResolvedValue({
      status: 'existing',
      message: {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        organizationId,
        direction: 'outbound',
        campaignId,
        recipientId: recipient.id,
        contactId: recipient.contactId,
        provider: 'fake',
        providerMessageId: null,
        providerMessagingServiceId: null,
        providerPhoneNumberId: null,
        fromPhone: sender.phoneNumber,
        toPhone: recipient.normalizedPhone,
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
      },
    });

    await expect(
      processCampaignSend({
        db,
        env: {
          DATABASE_URL: 'postgres://retaino.test/db',
          SMS_SENDING_MODE: 'test',
          TRACKING_BASE_URL: 'https://go.retaino.test',
        } as never,
        organizationId,
        campaignId,
        userId,
      }),
    ).rejects.toThrow('Campaign recipient send attempt is unresolved.');

    const provider = vi.mocked(createSmsProvider).mock.results[0]?.value;
    expect(provider.sendSms).not.toHaveBeenCalled();
    expect(releaseSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      credits: 1,
      reservedTransactions: expect.any(Array),
      source: 'campaign_send',
      sourceId: `campaign-send:${campaignId}:release`,
      description: 'Campaign SMS reservation release',
    });
    expect(markCampaignSendFailed).toHaveBeenCalledWith(db, {
      organizationId,
      campaignId,
      actualCreditCount: 0,
      failureReason: 'Campaign recipient send attempt is unresolved.',
    });
  });

  it('releases unused reserved credits after provider results are lower', async () => {
    const provider = {
      name: 'fake' as const,
      listSenderCountries: vi.fn(),
      searchSenderOptions: vi.fn(),
      ensureSender: vi.fn(),
      sendSms: vi.fn().mockResolvedValue({
        provider: 'fake',
        providerMessageId: 'fake-message-1',
        normalizedStatus: 'queued',
        providerStatus: 'queued',
        providerSenderReference: sender.providerMessagingServiceId,
        actualSegments: 0,
        cost: '0',
        currency: 'SEK',
        rawProviderReference: 'fake-message-1',
      }),
      parseStatusWebhook: vi.fn(),
      parseInboundWebhook: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    vi.mocked(createSmsProvider).mockReturnValue(provider);

    await processCampaignSend({
      db,
      env: {
        DATABASE_URL: 'postgres://retaino.test/db',
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      } as never,
      organizationId,
      campaignId,
      userId,
    });

    expect(releaseSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      credits: 1,
      reservedTransactions: expect.any(Array),
      source: 'campaign_send',
      sourceId: `campaign-send:${campaignId}:release`,
      description: 'Campaign SMS reservation release',
    });
    expect(
      vi.mocked(releaseSmsCreditUsage).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(markCampaignSendCompleted).mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('stores estimated segments when the provider omits actual segments', async () => {
    const provider = {
      name: 'fake' as const,
      listSenderCountries: vi.fn(),
      searchSenderOptions: vi.fn(),
      ensureSender: vi.fn(),
      sendSms: vi.fn().mockResolvedValue({
        provider: 'fake',
        providerMessageId: 'fake-message-1',
        normalizedStatus: 'queued',
        providerStatus: 'queued',
        providerSenderReference: sender.providerMessagingServiceId,
        actualSegments: null,
        cost: null,
        currency: 'SEK',
        rawProviderReference: 'fake-message-1',
      }),
      parseStatusWebhook: vi.fn(),
      parseInboundWebhook: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    vi.mocked(createSmsProvider).mockReturnValue(provider);

    await processCampaignSend({
      db,
      env: {
        DATABASE_URL: 'postgres://retaino.test/db',
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      } as never,
      organizationId,
      campaignId,
      userId,
    });

    expect(recordSmsMessageProviderResult).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        messageId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        actualSegmentCount: 1,
      }),
    );
    expect(markCampaignSendCompleted).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        actualCreditCount: 1,
      }),
    );
    expect(releaseSmsCreditUsage).not.toHaveBeenCalled();
  });

  it('reconciles against the existing reserved ledger amount on retries', async () => {
    vi.mocked(debitSmsCreditUsage).mockResolvedValue([
      {
        transactionType: 'debit',
        credits: -2,
        source: 'campaign_send',
        sourceId: `campaign-send:${campaignId}`,
        creditBucket: 'subscription_period',
        periodStart: '2026-05-01T00:00:00.000Z',
        periodEnd: '2026-06-01T00:00:00.000Z',
        description: 'Campaign SMS reservation',
        createdAt: '2026-05-16T10:00:00.000Z',
      },
    ]);

    await processCampaignSend({
      db,
      env: {
        DATABASE_URL: 'postgres://retaino.test/db',
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      } as never,
      organizationId,
      campaignId,
      userId,
    });

    expect(startCampaignSend).toHaveBeenCalledWith(db, {
      organizationId,
      campaignId,
      reservedCreditCount: 2,
    });
    expect(releaseSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      credits: 1,
      reservedTransactions: expect.any(Array),
      source: 'campaign_send',
      sourceId: `campaign-send:${campaignId}:release`,
      description: 'Campaign SMS reservation release',
    });
  });

  it('keeps reserved credits when another send is active so retry can continue', async () => {
    vi.mocked(startCampaignSend).mockResolvedValue({
      status: 'active_send_exists',
    });

    await expect(
      processCampaignSend({
        db,
        env: {
          DATABASE_URL: 'postgres://retaino.test/db',
          SMS_SENDING_MODE: 'test',
          TRACKING_BASE_URL: 'https://go.retaino.test',
        } as never,
        organizationId,
        campaignId,
        userId,
      }),
    ).rejects.toThrow('Another campaign send is already active.');

    expect(releaseSmsCreditUsage).not.toHaveBeenCalled();
    expect(createOutboundSmsMessage).not.toHaveBeenCalled();
    const provider = vi.mocked(createSmsProvider).mock.results[0]?.value;
    expect(provider.sendSms).not.toHaveBeenCalled();
  });

  it('marks the campaign failed and releases credits when provider send fails', async () => {
    const providerError = new Error('Provider timeout.');
    const provider = {
      name: 'fake' as const,
      listSenderCountries: vi.fn(),
      searchSenderOptions: vi.fn(),
      ensureSender: vi.fn(),
      sendSms: vi.fn().mockRejectedValue(providerError),
      parseStatusWebhook: vi.fn(),
      parseInboundWebhook: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    vi.mocked(createSmsProvider).mockReturnValue(provider);

    await expect(
      processCampaignSend({
        db,
        env: {
          DATABASE_URL: 'postgres://retaino.test/db',
          SMS_SENDING_MODE: 'test',
          TRACKING_BASE_URL: 'https://go.retaino.test',
        } as never,
        organizationId,
        campaignId,
        userId,
      }),
    ).rejects.toThrow('Provider timeout.');

    expect(markCampaignSendFailed).toHaveBeenCalledWith(db, {
      organizationId,
      campaignId,
      actualCreditCount: 0,
      failureReason: 'Provider timeout.',
    });
    expect(releaseSmsCreditUsage).toHaveBeenCalledWith({
      db,
      organizationId,
      credits: 1,
      reservedTransactions: expect.any(Array),
      source: 'campaign_send',
      sourceId: `campaign-send:${campaignId}:release`,
      description: 'Campaign SMS reservation release',
    });
    expect(
      vi.mocked(releaseSmsCreditUsage).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(markCampaignSendFailed).mock.invocationCallOrder[0] ?? 0,
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        organizationId,
        actorUserId: userId,
        eventType: 'campaign.failed',
        metadata: expect.objectContaining({
          reservedCreditCount: 1,
          actualCreditCount: 0,
          failureReason: 'Provider timeout.',
        }),
      }),
    );
    expect(markCampaignSendCompleted).not.toHaveBeenCalled();
  });

  it('skips recipients suppressed after launch', async () => {
    vi.mocked(findSuppressionByHash).mockResolvedValue({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      organizationId,
      type: 'phone',
      value: recipient.phone,
      normalizedValue: recipient.normalizedPhone,
      valueHash: recipient.phoneHash,
      reason: 'stop_reply',
      source: 'recipient_reply',
      createdAt: new Date('2026-05-16T10:01:00.000Z'),
    });

    await processCampaignSend({
      db,
      env: {
        DATABASE_URL: 'postgres://retaino.test/db',
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      } as never,
      organizationId,
      campaignId,
      userId,
    });

    expect(markCampaignRecipientSkipped).toHaveBeenCalledWith(db, {
      organizationId,
      recipientId: recipient.id,
      exclusionReason: 'suppressed_phone',
    });
    expect(debitSmsCreditUsage).not.toHaveBeenCalled();
    expect(createOutboundSmsMessage).not.toHaveBeenCalled();
    const provider = vi.mocked(createSmsProvider).mock.results[0]?.value;
    expect(provider.sendSms).not.toHaveBeenCalled();
  });
});
