import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOrganizationLegalAcceptance,
  getCurrentLegalBundle,
  getCurrentOrganizationLegalAcceptance,
  getOrganizationProfileByOrganizationId,
  markOrganizationOnboardingComplete,
  upsertOrganizationProfile,
} from '@retaino/db';
import type { LegalBundle, OrganizationLegalAcceptance } from '@retaino/shared/contracts';
import { organizationRoutes } from '../../../src/features/organization/organization.routes';
import type { AppEnv } from '../../../src/types';

vi.mock('@retaino/db', () => ({
  createOrganizationLegalAcceptance: vi.fn(),
  getCurrentLegalBundle: vi.fn(),
  getCurrentOrganizationLegalAcceptance: vi.fn(),
  getOrganizationProfileByOrganizationId: vi.fn(),
  markOrganizationOnboardingComplete: vi.fn(),
  upsertOrganizationProfile: vi.fn(),
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
  onboardingStatus: 'profile_required',
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

const legalBundle: LegalBundle = {
  version: '2026-05-09',
  hash: 'f'.repeat(64),
  documents: [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      legalDocumentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      documentType: 'terms',
      slug: 'terms',
      title: 'Retaino Terms and Conditions',
      documentVersion: '2026-05-09',
      effectiveDate: '2026-05-09',
      contentHash: 'a'.repeat(64),
      publicVisible: true,
      acceptanceRequired: true,
      sortOrder: 10,
      publishedAt: '2026-05-09T00:00:00.000Z',
    },
  ],
};

const legalAcceptance: OrganizationLegalAcceptance = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: organization.id,
  userId: user.id,
  bundleVersion: legalBundle.version,
  bundleHash: legalBundle.hash,
  documentsSnapshot: legalBundle.documents,
  ipAddress: '203.0.113.1',
  userAgent: 'vitest',
  acceptedAt: '2026-05-05T00:00:00.000Z',
  acceptedByEmail: user.email,
};

function testApp(input: { organization?: typeof organization } = {}) {
  const app = new Hono<AppEnv>();
  const activeOrganization = input.organization ?? organization;

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    c.set('user', user);
    c.set('organization', activeOrganization);
    await next();
  });

  app.route('/v1/organization', organizationRoutes);
  return app;
}

describe('organizationRoutes', () => {
  beforeEach(() => {
    vi.mocked(getOrganizationProfileByOrganizationId).mockReset();
    vi.mocked(getCurrentLegalBundle).mockReset();
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockReset();
    vi.mocked(markOrganizationOnboardingComplete).mockReset();
    vi.mocked(upsertOrganizationProfile).mockReset();
    vi.mocked(createOrganizationLegalAcceptance).mockReset();
    vi.mocked(getCurrentLegalBundle).mockResolvedValue(legalBundle);
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockResolvedValue(null);
  });

  it('returns the authenticated user, organization, legal bundle, and readiness state', async () => {
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(null);

    const response = await testApp().request('/v1/organization/me');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user,
      organization,
      profile: null,
      legalBundle,
      legalAcceptance: null,
      eligibility: {
        contactImports: {
          allowed: false,
          blocker: 'setup_required',
        },
      },
      readiness: {
        profileComplete: false,
        legalCurrent: false,
        setupComplete: false,
        legalUpdatesRequired: false,
        ready: false,
      },
    });
  });

  it('updates the active organization profile', async () => {
    vi.mocked(upsertOrganizationProfile).mockResolvedValue(profile);

    const response = await testApp().request('/v1/organization/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        legalName: 'Retaino AB',
        registrationNumber: '559000-0000',
        billingEmail: 'billing@retaino.test',
        responsibleName: 'Ada Lovelace',
        responsibleEmail: 'ada@retaino.test',
        responsiblePhone: '+46700000000',
        countryCode: 'SE',
      }),
    });

    expect(response.status).toBe(200);
    expect(upsertOrganizationProfile).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      legalName: 'Retaino AB',
      registrationNumber: '559000-0000',
      billingEmail: 'billing@retaino.test',
      responsibleName: 'Ada Lovelace',
      responsibleEmail: 'ada@retaino.test',
      responsiblePhone: '+46700000000',
      countryCode: 'SE',
    });
  });

  it('rejects organization profile updates from normal members', async () => {
    const response = await testApp({
      organization: {
        ...organization,
        role: 'org:member',
      },
    }).request('/v1/organization/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        legalName: 'Retaino AB',
        registrationNumber: '559000-0000',
        billingEmail: 'billing@retaino.test',
        responsibleName: 'Ada Lovelace',
        responsibleEmail: 'ada@retaino.test',
        countryCode: 'SE',
      }),
    });

    expect(response.status).toBe(403);
    expect(upsertOrganizationProfile).not.toHaveBeenCalled();
  });

  it('records current legal bundle acceptance metadata from the request', async () => {
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(profile);
    vi.mocked(createOrganizationLegalAcceptance).mockResolvedValue(
      legalAcceptance,
    );
    vi.mocked(markOrganizationOnboardingComplete).mockResolvedValue({
      id: organization.id,
      clerkOrganizationId: organization.clerkOrganizationId,
      name: organization.name,
      slug: organization.slug,
      onboardingStatus: 'complete',
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
      updatedAt: new Date('2026-05-05T00:00:00.000Z'),
    });

    const response = await testApp().request('/v1/organization/legal', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': '203.0.113.1',
        'user-agent': 'vitest',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(201);
    expect(createOrganizationLegalAcceptance).toHaveBeenCalledWith(
      expect.anything(),
      {
        organizationId: organization.id,
        userId: user.id,
        legalBundle,
        ipAddress: '203.0.113.1',
        userAgent: 'vitest',
      },
    );
    expect(markOrganizationOnboardingComplete).toHaveBeenCalledWith(
      expect.anything(),
      organization.id,
    );
    await expect(response.json()).resolves.toMatchObject({
      legalAcceptance,
      eligibility: {
        contactImports: {
          allowed: true,
          blocker: null,
        },
      },
      readiness: {
        profileComplete: true,
        legalCurrent: true,
        setupComplete: true,
        legalUpdatesRequired: false,
        ready: true,
      },
    });
  });

  it('does not complete onboarding from legal acceptance when the profile is missing', async () => {
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(null);

    const response = await testApp().request('/v1/organization/legal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(403);
    expect(createOrganizationLegalAcceptance).not.toHaveBeenCalled();
    expect(markOrganizationOnboardingComplete).not.toHaveBeenCalled();
  });

  it('does not let the client spoof legal document versions', async () => {
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(profile);
    vi.mocked(createOrganizationLegalAcceptance).mockResolvedValue(
      legalAcceptance,
    );
    vi.mocked(markOrganizationOnboardingComplete).mockResolvedValue({
      id: organization.id,
      clerkOrganizationId: organization.clerkOrganizationId,
      name: organization.name,
      slug: organization.slug,
      onboardingStatus: 'complete',
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
      updatedAt: new Date('2026-05-05T00:00:00.000Z'),
    });

    const response = await testApp().request('/v1/organization/legal', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        documents: [{ documentType: 'terms', documentVersion: '2020-01-01' }],
      }),
    });

    expect(response.status).toBe(400);
    expect(createOrganizationLegalAcceptance).not.toHaveBeenCalled();
  });

  it('rejects legal bundle acceptance from normal members', async () => {
    const response = await testApp({
      organization: {
        ...organization,
        role: 'org:member',
      },
    }).request('/v1/organization/legal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(403);
    expect(createOrganizationLegalAcceptance).not.toHaveBeenCalled();
  });
});
