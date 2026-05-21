import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCampaignDraft,
  countCampaignRecipients,
  deleteCampaignDraft,
  findSuppressionByHash,
  getCampaignById,
  getCampaignReport,
  getCurrentLegalBundle,
  getCurrentOrganizationLegalAcceptance,
  getOrganizationBillingProfile,
  getOrganizationProfileByOrganizationId,
  getOrganizationSmsSender,
  getSmsCreditBalance,
  getSmsCreditBalanceBreakdown,
  getSmsCreditReservationState,
  launchCampaign,
  listSelectedCampaignRecipientsForSend,
  listCampaigns,
  previewCampaignAudience,
  reserveSmsCreditsIfSufficient,
  updateCampaignDraft,
} from '@retaino/db';
import type {
  Campaign,
  LegalBundle,
  LegalDocumentVersion,
  OrganizationLegalAcceptance,
} from '@retaino/shared/contracts';
import { campaignsRoutes } from '../../../src/features/campaigns/campaigns.routes';
import { enqueueCampaignSendProcessing } from '../../../src/features/campaigns/campaigns.jobs';
import type { AppEnv } from '../../../src/types';

vi.mock('@retaino/db', () => ({
  createCampaignDraft: vi.fn(),
  countCampaignRecipients: vi.fn(),
  deleteCampaignDraft: vi.fn(),
  findSuppressionByHash: vi.fn(),
  getCampaignById: vi.fn(),
  getCampaignReport: vi.fn(),
  getCurrentLegalBundle: vi.fn(),
  getCurrentOrganizationLegalAcceptance: vi.fn(),
  getOrganizationBillingProfile: vi.fn(),
  getOrganizationProfileByOrganizationId: vi.fn(),
  getOrganizationSmsSender: vi.fn(),
  getSmsCreditBalance: vi.fn(),
  getSmsCreditBalanceBreakdown: vi.fn(),
  getSmsCreditReservationState: vi.fn(),
  launchCampaign: vi.fn(),
  listSelectedCampaignRecipientsForSend: vi.fn(),
  listCampaigns: vi.fn(),
  previewCampaignAudience: vi.fn(),
  reserveSmsCreditsIfSufficient: vi.fn(),
  updateCampaignDraft: vi.fn(),
}));

vi.mock('../../../src/features/campaigns/campaigns.jobs', () => ({
  enqueueCampaignSendProcessing: vi.fn(),
}));

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  clerkUserId: 'user_123',
  email: 'ada@retaino.test',
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
};

const organization = {
  id: '22222222-2222-4222-8222-222222222222',
  clerkOrganizationId: 'org_123',
  name: 'Retaino',
  slug: 'retaino',
  onboardingStatus: 'complete',
  role: 'org:admin',
};

const profile = {
  id: '33333333-3333-4333-8333-333333333333',
  organizationId: organization.id,
  legalName: 'Retaino AB',
  registrationNumber: '559000-0000',
  billingEmail: 'billing@retaino.test',
  responsibleName: 'Ada Lovelace',
  responsibleEmail: 'ada@retaino.test',
  responsiblePhone: '+46700000000',
  countryCode: 'SE',
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
};

const legalDocumentVersions: LegalDocumentVersion[] = [
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    legalDocumentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    documentType: 'terms',
    slug: 'terms',
    title: 'Retaino Terms and Conditions',
    documentVersion: '2026-05-08',
    effectiveDate: '2026-05-08',
    bodyMdx: '# Terms',
    contentHash: 'a'.repeat(64),
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 10,
    publishedAt: '2026-05-08T00:00:00.000Z',
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  },
];

const legalBundle: LegalBundle = {
  version: '2026-05-09',
  hash: 'f'.repeat(64),
  documents: legalDocumentVersions.map((document) => ({
    id: document.id,
    legalDocumentId: document.legalDocumentId,
    documentType: document.documentType,
    slug: document.slug,
    title: document.title,
    documentVersion: document.documentVersion,
    effectiveDate: document.effectiveDate,
    contentHash: document.contentHash,
    publicVisible: document.publicVisible,
    acceptanceRequired: document.acceptanceRequired,
    sortOrder: document.sortOrder,
    publishedAt: document.publishedAt,
  })),
};

const legalAcceptance: OrganizationLegalAcceptance = {
  id: '99999999-9999-4999-8999-999999999999',
  organizationId: organization.id,
  userId: user.id,
  bundleVersion: legalBundle.version,
  bundleHash: legalBundle.hash,
  documentsSnapshot: legalBundle.documents,
  ipAddress: '203.0.113.1',
  userAgent: 'vitest',
  acceptedAt: '2026-05-08T00:00:00.000Z',
  acceptedByEmail: user.email,
};

const campaign: Campaign = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: organization.id,
  createdByUserId: user.id,
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
  createdAt: '2026-05-16T00:00:00.000Z',
  updatedAt: '2026-05-16T00:00:00.000Z',
};

const campaignRecipientForSend = {
  id: '77777777-7777-4777-8777-777777777777',
  organizationId: organization.id,
  campaignId: campaign.id,
  contactId: '88888888-8888-4888-8888-888888888888',
  status: 'selected',
  exclusionReason: null,
  name: 'Ada Lovelace',
  phone: '+46700000000',
  email: 'ada@example.com',
  normalizedPhone: '+46700000000',
  normalizedEmail: 'ada@example.com',
  phoneHash: 'phone-hash',
  emailHash: 'email-hash',
  lastBookingAt: '2026-01-01T00:00:00.000Z',
  lastContactedAt: null,
  selectedAt: '2026-05-16T10:00:00.000Z',
} as const;

function testApp(input: { role?: string } = {}) {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    c.set('user', user);
    c.set('organization', {
      ...organization,
      role: input.role ?? organization.role,
    });
    await next();
  });

  app.route('/v1/campaigns', campaignsRoutes);
  return app;
}

describe('campaignsRoutes', () => {
  beforeEach(() => {
    vi.mocked(createCampaignDraft).mockReset();
    vi.mocked(countCampaignRecipients).mockReset();
    vi.mocked(reserveSmsCreditsIfSufficient).mockReset();
    vi.mocked(deleteCampaignDraft).mockReset();
    vi.mocked(findSuppressionByHash).mockReset();
    vi.mocked(getCampaignById).mockReset();
    vi.mocked(getCampaignReport).mockReset();
    vi.mocked(getCurrentLegalBundle).mockReset();
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockReset();
    vi.mocked(getOrganizationBillingProfile).mockReset();
    vi.mocked(getOrganizationProfileByOrganizationId).mockReset();
    vi.mocked(getOrganizationSmsSender).mockReset();
    vi.mocked(getSmsCreditBalance).mockReset();
    vi.mocked(getSmsCreditBalanceBreakdown).mockReset();
    vi.mocked(getSmsCreditReservationState).mockReset();
    vi.mocked(launchCampaign).mockReset();
    vi.mocked(enqueueCampaignSendProcessing).mockReset();
    vi.mocked(listSelectedCampaignRecipientsForSend).mockReset();
    vi.mocked(listCampaigns).mockReset();
    vi.mocked(previewCampaignAudience).mockReset();
    vi.mocked(updateCampaignDraft).mockReset();
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(profile);
    vi.mocked(getCurrentLegalBundle).mockResolvedValue(legalBundle);
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockResolvedValue(legalAcceptance);
    vi.mocked(findSuppressionByHash).mockResolvedValue(null);
    vi.mocked(getSmsCreditReservationState).mockResolvedValue({
      activeSourceId: null,
      hasHistory: false,
    });
    vi.mocked(listSelectedCampaignRecipientsForSend).mockResolvedValue({
      recipients: [campaignRecipientForSend],
    });
    vi.mocked(reserveSmsCreditsIfSufficient).mockResolvedValue({
      debitedCredits: 1,
      transactions: [
        {
          transactionType: 'debit',
          source: 'campaign_send',
          sourceId: `campaign-send:${campaign.id}`,
          credits: -1,
          creditBucket: 'subscription_period',
          periodStart: '2026-05-01T00:00:00.000Z',
          periodEnd: '2026-06-01T00:00:00.000Z',
          description: 'Campaign SMS reservation',
          createdAt: '2026-05-18T00:00:00.000Z',
        },
      ],
    });
  });

  it('lets members list and read campaigns for the active organization', async () => {
    vi.mocked(listCampaigns).mockResolvedValue({ campaigns: [campaign] });
    vi.mocked(getCampaignById).mockResolvedValue(campaign);

    const list = await testApp({ role: 'org:member' }).request('/v1/campaigns');
    const read = await testApp({ role: 'org:member' }).request(
      `/v1/campaigns/${campaign.id}`,
    );

    expect(list.status).toBe(200);
    expect(read.status).toBe(200);
    expect(listCampaigns).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
    });
    expect(getCampaignById).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      campaignId: campaign.id,
    });
  });

  it('lets members create campaigns with authenticated organization and user ids', async () => {
    vi.mocked(createCampaignDraft).mockResolvedValue(campaign);

    const response = await testApp({ role: 'org:member' }).request(
      '/v1/campaigns',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: campaign.name,
          audienceRule: campaign.audienceRule,
          smsBody: campaign.smsBody,
          bookingUrl: campaign.bookingUrl,
        }),
      },
    );

    expect(response.status).toBe(201);
    expect(createCampaignDraft).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      createdByUserId: user.id,
      input: {
        name: campaign.name,
        audienceRule: campaign.audienceRule,
        smsBody: campaign.smsBody,
        bookingUrl: campaign.bookingUrl,
        campaignCode: null,
        attributionWindowDays: 7,
      },
    });
  });

  it('creates partial drafts before message and booking are complete', async () => {
    vi.mocked(createCampaignDraft).mockResolvedValue({
      ...campaign,
      bookingUrl: null,
      smsBody: null,
    });

    const response = await testApp().request('/v1/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: campaign.name,
        audienceRule: campaign.audienceRule,
      }),
    });

    expect(response.status).toBe(201);
    expect(createCampaignDraft).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      createdByUserId: user.id,
      input: {
        name: campaign.name,
        audienceRule: campaign.audienceRule,
        smsBody: null,
        bookingUrl: null,
        campaignCode: null,
        attributionWindowDays: 7,
      },
    });
  });

  it('previews unsaved audience rules for members using the active organization', async () => {
    vi.mocked(previewCampaignAudience).mockResolvedValue({
      eligibleCount: 12,
      suppressedCount: 2,
      incompleteCount: 3,
      missingConsentCount: 4,
      sampleContacts: [],
    });

    const response = await testApp({ role: 'org:member' }).request(
      '/v1/campaigns/audience-preview',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          audienceRule: {
            lapsedDays: 60,
            includeNoBookingDate: true,
          },
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(previewCampaignAudience).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      audienceRule: {
        lapsedDays: 60,
        includeNoBookingDate: true,
      },
    });
  });

  it('defaults unsaved audience preview rules', async () => {
    vi.mocked(previewCampaignAudience).mockResolvedValue({
      eligibleCount: 0,
      suppressedCount: 0,
      incompleteCount: 0,
      missingConsentCount: 0,
      sampleContacts: [],
    });

    const response = await testApp().request('/v1/campaigns/audience-preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(200);
    expect(previewCampaignAudience).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      audienceRule: {
        lapsedDays: 90,
        includeNoBookingDate: false,
      },
    });
  });

  it('previews saved campaign audiences by campaign id', async () => {
    vi.mocked(getCampaignById).mockResolvedValue(campaign);
    vi.mocked(previewCampaignAudience).mockResolvedValue({
      eligibleCount: 5,
      suppressedCount: 1,
      incompleteCount: 0,
      missingConsentCount: 2,
      sampleContacts: [],
    });

    const response = await testApp({ role: 'org:member' }).request(
      `/v1/campaigns/${campaign.id}/audience-preview`,
    );

    expect(response.status).toBe(200);
    expect(getCampaignById).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      campaignId: campaign.id,
    });
    expect(previewCampaignAudience).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      audienceRule: campaign.audienceRule,
    });
  });

  it('previews the final SMS for a campaign', async () => {
    vi.mocked(getCampaignById).mockResolvedValue({
      ...campaign,
      smsBody: 'Hi {first_name}, we have openings this week.',
    });

    const response = await testApp({ role: 'org:member' }).request(
      `/v1/campaigns/${campaign.id}/sms/preview`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      preview: {
        renderedBody: string;
        estimatedSmsPerRecipient: number;
      };
    };

    expect(body.preview.renderedBody).toContain('Hi Anna');
    expect(body.preview.renderedBody).toContain('https://go.retaino.com/r/');
    expect(body.preview.renderedBody).toContain('Reply STOP to opt out');
    expect(body.preview.estimatedSmsPerRecipient).toBeGreaterThan(0);
  });

  it('launches draft campaigns and enqueues live send processing', async () => {
    vi.mocked(getCampaignById).mockResolvedValue(campaign);
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(readySender());
    vi.mocked(launchCampaign).mockResolvedValue({
      status: 'launched',
      campaign: {
        ...campaign,
        status: 'ready_to_send',
        readyToSendAt: '2026-05-16T10:00:00.000Z',
        readyToSendByUserId: user.id,
      },
      recipientCount: 3,
    });
    vi.mocked(enqueueCampaignSendProcessing).mockResolvedValue(undefined);

    const response = await testApp().request(
      `/v1/campaigns/${campaign.id}/send`,
      { method: 'POST' },
      {
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      },
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      campaign: {
        status: 'ready_to_send',
      },
      recipientCount: 3,
      sendStatus: 'queued',
    });
    expect(launchCampaign).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: organization.id,
        campaignId: campaign.id,
        actorUserId: user.id,
      }),
    );
    expect(enqueueCampaignSendProcessing).toHaveBeenCalledWith(
      expect.anything(),
      {
        organizationId: organization.id,
        campaignId: campaign.id,
        userId: user.id,
      },
    );
    expect(reserveSmsCreditsIfSufficient).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: organization.id,
        credits: 1,
        source: 'campaign_send',
        sourceId: `campaign-send:${campaign.id}`,
      }),
    );
  });

  it('enqueues ready campaigns without launching again', async () => {
    const readyCampaign = {
      ...campaign,
      status: 'ready_to_send',
      readyToSendAt: '2026-05-16T10:00:00.000Z',
      readyToSendByUserId: user.id,
    } as const;

    vi.mocked(getCampaignById).mockResolvedValue(readyCampaign);
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(readySender());
    vi.mocked(countCampaignRecipients).mockResolvedValue({
      recipientCount: 3,
    });
    vi.mocked(enqueueCampaignSendProcessing).mockResolvedValue(undefined);

    const response = await testApp().request(
      `/v1/campaigns/${campaign.id}/send`,
      { method: 'POST' },
      {
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      },
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      campaign: {
        status: 'ready_to_send',
      },
      sendStatus: 'queued',
    });
    expect(launchCampaign).not.toHaveBeenCalled();
    expect(enqueueCampaignSendProcessing).toHaveBeenCalledWith(
      expect.anything(),
      {
        organizationId: organization.id,
        campaignId: campaign.id,
        userId: user.id,
      },
    );
    expect(reserveSmsCreditsIfSufficient).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: organization.id,
        source: 'campaign_send',
        sourceId: `campaign-send:${campaign.id}`,
      }),
    );
  });

  it('rejects ready campaign sends when the sender is not ready', async () => {
    vi.mocked(getCampaignById).mockResolvedValue({
      ...campaign,
      status: 'ready_to_send',
      readyToSendAt: '2026-05-16T10:00:00.000Z',
      readyToSendByUserId: user.id,
    });
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(null);

    const response = await testApp().request(
      `/v1/campaigns/${campaign.id}/send`,
      { method: 'POST' },
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(409);
    expect(enqueueCampaignSendProcessing).not.toHaveBeenCalled();
  });

  it('blocks live send before enqueue when credits are insufficient', async () => {
    vi.mocked(getCampaignById).mockResolvedValue({
      ...campaign,
      status: 'ready_to_send',
      readyToSendAt: '2026-05-16T10:00:00.000Z',
      readyToSendByUserId: user.id,
    });
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(readySender());
    vi.mocked(countCampaignRecipients).mockResolvedValue({
      recipientCount: 3,
    });
    vi.mocked(reserveSmsCreditsIfSufficient).mockResolvedValue({
      debitedCredits: 0,
      transactions: [],
    });
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(activeBilling());
    vi.mocked(getSmsCreditBalance).mockResolvedValue(0);

    const response = await testApp().request(
      `/v1/campaigns/${campaign.id}/send`,
      { method: 'POST' },
      {
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      },
    );

    expect(response.status).toBe(409);
    expect(enqueueCampaignSendProcessing).not.toHaveBeenCalled();
  });

  it('lets members read campaign recipient counts without snapshots', async () => {
    vi.mocked(countCampaignRecipients).mockResolvedValue({
      recipientCount: 12,
    });

    const response = await testApp({ role: 'org:member' }).request(
      `/v1/campaigns/${campaign.id}/recipients/summary`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      recipientCount: 12,
    });
    expect(countCampaignRecipients).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      campaignId: campaign.id,
    });
  });

  it('lets members read tenant-scoped campaign reports', async () => {
    vi.mocked(getCampaignReport).mockResolvedValue({
      selectedCount: 10,
      queuedCount: 0,
      sentCount: 9,
      deliveredCount: 8,
      failedCount: 1,
      skippedCount: 1,
      optOutCount: 1,
      inboundReplyCount: 2,
      clickCount: 4,
      uniqueClickerCount: 3,
      estimatedSmsSegments: 10,
      actualSmsSegments: 9,
      segmentEstimateDrift: -1,
      estimatedCostMinor: null,
      actualCostMinor: null,
      currency: 'SEK',
    });

    const response = await testApp({ role: 'org:member' }).request(
      `/v1/campaigns/${campaign.id}/report`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      report: {
        selectedCount: 10,
        deliveredCount: 8,
      },
    });
    expect(getCampaignReport).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      campaignId: campaign.id,
    });
  });

  it('sends a test SMS without creating campaign recipients', async () => {
    vi.mocked(getCampaignById).mockResolvedValue(campaign);
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(activeBilling());
    vi.mocked(getSmsCreditBalance).mockResolvedValue(10);
    vi.mocked(getSmsCreditBalanceBreakdown).mockResolvedValue({
      purchased: 0,
      subscriptionPeriod: 10,
      total: 10,
    });
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(readySender());
    vi.mocked(reserveSmsCreditsIfSufficient).mockResolvedValue({
      debitedCredits: 1,
      transactions: [
        {
          transactionType: 'debit',
          source: 'campaign_test_send',
          sourceId: 'campaign-test-123',
          credits: -1,
          creditBucket: 'subscription_period',
          periodStart: '2026-05-01T00:00:00.000Z',
          periodEnd: '2026-06-01T00:00:00.000Z',
          description: 'Campaign test SMS usage',
          createdAt: '2026-05-18T00:00:00.000Z',
        },
      ],
    });

    const response = await testApp().request(
      `/v1/campaigns/${campaign.id}/sms/send`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ testPhone: '0700000000' }),
      },
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      testSend: {
        to: string;
        chargedCredits: number;
        status: string;
      };
    };

    expect(body.testSend).toMatchObject({
      to: '+46700000000',
      chargedCredits: 1,
      status: 'queued',
    });
    expect(getOrganizationSmsSender).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      provider: 'fake',
    });
    expect(reserveSmsCreditsIfSufficient).toHaveBeenCalledWith(
      expect.anything(),
      {
        organizationId: organization.id,
        source: 'campaign_test_send',
        credits: 1,
        sourceId: expect.stringMatching(
          /^campaign-test:44444444-4444-4444-8444-444444444444:/,
        ),
        description: 'Campaign test SMS usage',
      },
    );
  });

  it('uses the responsible phone when no explicit test phone is provided', async () => {
    vi.mocked(getCampaignById).mockResolvedValue(campaign);
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(activeBilling());
    vi.mocked(getSmsCreditBalance).mockResolvedValue(10);
    vi.mocked(getSmsCreditBalanceBreakdown).mockResolvedValue({
      purchased: 0,
      subscriptionPeriod: 10,
      total: 10,
    });
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(readySender());
    vi.mocked(reserveSmsCreditsIfSufficient).mockResolvedValue({
      debitedCredits: 1,
      transactions: [],
    });

    const response = await testApp().request(
      `/v1/campaigns/${campaign.id}/sms/send`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      },
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      testSend: {
        to: profile.responsiblePhone,
      },
    });
  });

  it('rejects organization ids in campaign create bodies', async () => {
    const response = await testApp().request('/v1/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        name: campaign.name,
        audienceRule: campaign.audienceRule,
        smsBody: campaign.smsBody,
        bookingUrl: campaign.bookingUrl,
      }),
    });

    expect(response.status).toBe(400);
    expect(createCampaignDraft).not.toHaveBeenCalled();
  });

  it('lets members update and delete draft campaigns', async () => {
    vi.mocked(updateCampaignDraft).mockResolvedValue({
      status: 'updated',
      campaign: { ...campaign, name: 'Updated campaign' },
    });
    vi.mocked(deleteCampaignDraft).mockResolvedValue(true);

    const update = await testApp({ role: 'org:member' }).request(
      `/v1/campaigns/${campaign.id}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Updated campaign' }),
      },
    );
    const deleted = await testApp({ role: 'org:member' }).request(
      `/v1/campaigns/${campaign.id}`,
      {
        method: 'DELETE',
      },
    );

    expect(update.status).toBe(200);
    expect(deleted.status).toBe(204);
    expect(updateCampaignDraft).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      campaignId: campaign.id,
      input: { name: 'Updated campaign' },
    });
    expect(deleteCampaignDraft).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      campaignId: campaign.id,
    });
  });

  it('returns conflict when updating a non-draft campaign', async () => {
    vi.mocked(updateCampaignDraft).mockResolvedValue({ status: 'not_editable' });

    const response = await testApp().request(`/v1/campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated campaign' }),
    });

    expect(response.status).toBe(409);
  });

  it('returns conflict when deleting a launched campaign', async () => {
    vi.mocked(deleteCampaignDraft).mockResolvedValue(false);
    vi.mocked(getCampaignById).mockResolvedValue({
      ...campaign,
      status: 'ready_to_send',
      readyToSendAt: '2026-05-16T10:00:00.000Z',
      readyToSendByUserId: user.id,
    });

    const response = await testApp().request(`/v1/campaigns/${campaign.id}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(409);
  });
});

function activeBilling() {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    organizationId: organization.id,
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    stripePriceId: 'price_123',
    planKey: 'starter',
    subscriptionStatus: 'active',
    currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    syncedAt: new Date('2026-05-18T00:00:00.000Z'),
    createdAt: new Date('2026-05-18T00:00:00.000Z'),
    updatedAt: new Date('2026-05-18T00:00:00.000Z'),
  };
}

function readySender() {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    organizationId: organization.id,
    provider: 'fake',
    status: 'ready',
    phoneNumber: '+46700000000',
    countryCode: 'SE',
    numberType: 'mobile',
    providerMessagingServiceId: `fake-ms-${organization.id}`,
    providerPhoneNumberId: 'fake-se-mobile-1',
    regulatoryStatus: 'not_required',
    failureReason: null,
    provisionedAt: '2026-05-18T00:00:00.000Z',
    lastVerifiedAt: '2026-05-18T00:00:00.000Z',
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  } as const;
}
