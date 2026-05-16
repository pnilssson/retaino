import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCampaignDraft,
  deleteCampaignDraft,
  getCampaignById,
  getCurrentLegalBundle,
  getCurrentOrganizationLegalAcceptance,
  getOrganizationProfileByOrganizationId,
  listCampaigns,
  previewCampaignAudience,
  updateCampaignDraft,
} from '@retaino/db';
import type {
  Campaign,
  LegalBundle,
  LegalDocumentVersion,
  OrganizationLegalAcceptance,
} from '@retaino/shared/contracts';
import { campaignsRoutes } from '../../../src/features/campaigns/campaigns.routes';
import type { AppEnv } from '../../../src/types';

vi.mock('@retaino/db', () => ({
  createCampaignDraft: vi.fn(),
  deleteCampaignDraft: vi.fn(),
  getCampaignById: vi.fn(),
  getCurrentLegalBundle: vi.fn(),
  getCurrentOrganizationLegalAcceptance: vi.fn(),
  getOrganizationProfileByOrganizationId: vi.fn(),
  listCampaigns: vi.fn(),
  previewCampaignAudience: vi.fn(),
  updateCampaignDraft: vi.fn(),
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
  createdAt: '2026-05-16T00:00:00.000Z',
  updatedAt: '2026-05-16T00:00:00.000Z',
};

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
    vi.mocked(deleteCampaignDraft).mockReset();
    vi.mocked(getCampaignById).mockReset();
    vi.mocked(getCurrentLegalBundle).mockReset();
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockReset();
    vi.mocked(getOrganizationProfileByOrganizationId).mockReset();
    vi.mocked(listCampaigns).mockReset();
    vi.mocked(previewCampaignAudience).mockReset();
    vi.mocked(updateCampaignDraft).mockReset();
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(profile);
    vi.mocked(getCurrentLegalBundle).mockResolvedValue(legalBundle);
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockResolvedValue(legalAcceptance);
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

  it('creates campaigns with authenticated organization and user ids', async () => {
    vi.mocked(createCampaignDraft).mockResolvedValue(campaign);

    const response = await testApp().request('/v1/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: campaign.name,
        audienceRule: campaign.audienceRule,
        smsBody: campaign.smsBody,
        bookingUrl: campaign.bookingUrl,
      }),
    });

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

  it('updates and deletes draft campaigns for organization admins', async () => {
    vi.mocked(updateCampaignDraft).mockResolvedValue({
      status: 'updated',
      campaign: { ...campaign, name: 'Updated campaign' },
    });
    vi.mocked(deleteCampaignDraft).mockResolvedValue(true);

    const update = await testApp().request(`/v1/campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated campaign' }),
    });
    const deleted = await testApp().request(`/v1/campaigns/${campaign.id}`, {
      method: 'DELETE',
    });

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

  it('rejects campaign mutations for organization members', async () => {
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

    expect(response.status).toBe(403);
    expect(createCampaignDraft).not.toHaveBeenCalled();
  });

  it('rejects campaign updates and deletes for organization members', async () => {
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
      { method: 'DELETE' },
    );

    expect(update.status).toBe(403);
    expect(deleted.status).toBe(403);
    expect(updateCampaignDraft).not.toHaveBeenCalled();
    expect(deleteCampaignDraft).not.toHaveBeenCalled();
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
});
