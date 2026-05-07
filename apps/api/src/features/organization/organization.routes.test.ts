import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOrganizationAcceptance,
  getCurrentRequiredLegalDocumentVersions,
  getOrganizationProfileByOrganizationId,
  getPublishedLegalDocumentVersion,
  listOrganizationAcceptedDocuments,
  upsertOrganizationProfile,
} from '@retaino/db';
import type { LegalDocumentVersion } from '@retaino/shared/contracts';
import { organizationRoutes } from './organization.routes';
import type { AppEnv } from '../../types';

vi.mock('@retaino/db', () => ({
  createOrganizationAcceptance: vi.fn(),
  getCurrentRequiredLegalDocumentVersions: vi.fn(),
  getOrganizationProfileByOrganizationId: vi.fn(),
  getPublishedLegalDocumentVersion: vi.fn(),
  listOrganizationAcceptedDocuments: vi.fn(),
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
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
};

const requiredLegalDocuments: LegalDocumentVersion[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    legalDocumentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    documentType: 'terms',
    slug: 'terms',
    title: 'Retaino Terms and Conditions',
    documentVersion: '2026-05-07',
    effectiveDate: '2026-05-07',
    bodyMdx: '# Retaino Terms and Conditions',
    contentHash: 'a'.repeat(64),
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 10,
    publishedAt: '2026-05-07T00:00:00.000Z',
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    legalDocumentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    documentType: 'dpa',
    slug: 'dpa',
    title: 'Retaino Data Processing Agreement',
    documentVersion: '2026-05-07',
    effectiveDate: '2026-05-07',
    bodyMdx: '# Retaino Data Processing Agreement',
    contentHash: 'b'.repeat(64),
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 20,
    publishedAt: '2026-05-07T00:00:00.000Z',
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
  },
];
const [termsDocument] = requiredLegalDocuments as [
  LegalDocumentVersion,
  ...LegalDocumentVersion[],
];
const dpaDocument = requiredLegalDocuments[1] as LegalDocumentVersion;

function testApp(input: { organization?: typeof organization } = {}) {
  const app = new Hono<AppEnv>();
  const activeOrganization = input.organization ?? organization;

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    c.set('user', user);
    c.set('organization', activeOrganization);
    await next();
  });

  app.route('/v1', organizationRoutes);
  return app;
}

describe('organizationRoutes', () => {
  beforeEach(() => {
    vi.mocked(getOrganizationProfileByOrganizationId).mockReset();
    vi.mocked(getCurrentRequiredLegalDocumentVersions).mockReset();
    vi.mocked(getPublishedLegalDocumentVersion).mockReset();
    vi.mocked(listOrganizationAcceptedDocuments).mockReset();
    vi.mocked(upsertOrganizationProfile).mockReset();
    vi.mocked(createOrganizationAcceptance).mockReset();
  });

  it('returns the authenticated user, organization, and readiness state', async () => {
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(null);
    vi.mocked(getCurrentRequiredLegalDocumentVersions).mockResolvedValue(
      requiredLegalDocuments,
    );
    vi.mocked(listOrganizationAcceptedDocuments).mockResolvedValue([
      {
        documentType: 'terms',
        documentVersion: '2026-05-07',
        legalDocumentVersionId: termsDocument.id,
        contentHash: termsDocument.contentHash,
      },
    ]);

    const response = await testApp().request('/v1/me');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user,
      organization,
      profile: null,
      acceptedDocuments: [
        {
          documentType: 'terms',
          documentVersion: '2026-05-07',
          legalDocumentVersionId: termsDocument.id,
          contentHash: termsDocument.contentHash,
        },
      ],
      requiredLegalDocuments,
      readiness: {
        profileComplete: false,
        complianceComplete: false,
        ready: false,
        missingAcceptanceTypes: ['dpa'],
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
      }),
    });

    expect(response.status).toBe(403);
    expect(upsertOrganizationProfile).not.toHaveBeenCalled();
  });

  it('records compliance acceptance metadata from the request', async () => {
    vi.mocked(getCurrentRequiredLegalDocumentVersions).mockResolvedValue(
      requiredLegalDocuments,
    );
    vi.mocked(getPublishedLegalDocumentVersion).mockResolvedValue(
      termsDocument,
    );
    vi.mocked(createOrganizationAcceptance).mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      organizationId: organization.id,
      userId: user.id,
      legalDocumentVersionId: termsDocument.id,
      documentType: 'terms',
      documentVersion: '2026-05-07',
      contentHash: termsDocument.contentHash,
      ipAddress: '203.0.113.1',
      userAgent: 'vitest',
      acceptedAt: '2026-05-05T00:00:00.000Z',
    });

    const response = await testApp().request('/v1/organization/acceptances', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': '203.0.113.1',
        'user-agent': 'vitest',
      },
      body: JSON.stringify({
        documentType: 'terms',
        documentVersion: '2026-05-07',
      }),
    });

    expect(response.status).toBe(201);
    expect(createOrganizationAcceptance).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      userId: user.id,
      legalDocumentVersion: termsDocument,
      ipAddress: '203.0.113.1',
      userAgent: 'vitest',
    });
  });

  it('rejects compliance acceptance from normal members', async () => {
    const response = await testApp({
      organization: {
        ...organization,
        role: 'org:member',
      },
    }).request('/v1/organization/acceptances/current', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        documents: requiredLegalDocuments.map((document) => ({
          documentType: document.documentType,
          documentVersion: document.documentVersion,
        })),
      }),
    });

    expect(response.status).toBe(403);
    expect(createOrganizationAcceptance).not.toHaveBeenCalled();
  });

  it('rejects acceptance for public documents that are not required', async () => {
    const response = await testApp().request('/v1/organization/acceptances', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        documentType: 'privacy',
        documentVersion: '2026-05-07',
      }),
    });

    expect(response.status).toBe(400);
    expect(createOrganizationAcceptance).not.toHaveBeenCalled();
  });

  it('records all current required acceptances in one request', async () => {
    vi.mocked(getCurrentRequiredLegalDocumentVersions).mockResolvedValue(
      requiredLegalDocuments,
    );
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(profile);
    vi.mocked(listOrganizationAcceptedDocuments).mockResolvedValue([
      {
        documentType: 'terms',
        documentVersion: '2026-05-07',
        legalDocumentVersionId: termsDocument.id,
        contentHash: termsDocument.contentHash,
      },
      {
        documentType: 'dpa',
        documentVersion: '2026-05-07',
        legalDocumentVersionId: dpaDocument.id,
        contentHash: dpaDocument.contentHash,
      },
    ]);
    vi.mocked(createOrganizationAcceptance).mockResolvedValue(null);

    const response = await testApp().request(
      '/v1/organization/acceptances/current',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': '203.0.113.1',
          'user-agent': 'vitest',
        },
        body: JSON.stringify({
          documents: requiredLegalDocuments.map((document) => ({
            documentType: document.documentType,
            documentVersion: document.documentVersion,
          })),
        }),
      },
    );

    expect(response.status).toBe(201);
    expect(createOrganizationAcceptance).toHaveBeenCalledTimes(2);
    expect(createOrganizationAcceptance).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        organizationId: organization.id,
        userId: user.id,
        legalDocumentVersion: termsDocument,
        ipAddress: '203.0.113.1',
        userAgent: 'vitest',
      },
    );
    await expect(response.json()).resolves.toMatchObject({
      readiness: {
        profileComplete: true,
        complianceComplete: true,
        ready: true,
        missingAcceptanceTypes: [],
      },
    });
  });

  it('rejects bulk acceptance when any current required document is missing', async () => {
    vi.mocked(getCurrentRequiredLegalDocumentVersions).mockResolvedValue(
      requiredLegalDocuments,
    );

    const response = await testApp().request(
      '/v1/organization/acceptances/current',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          documents: [
            {
              documentType: 'terms',
              documentVersion: '2026-05-07',
            },
          ],
        }),
      },
    );

    expect(response.status).toBe(400);
    expect(createOrganizationAcceptance).not.toHaveBeenCalled();
  });

  it('rejects bulk acceptance for stale document versions', async () => {
    vi.mocked(getCurrentRequiredLegalDocumentVersions).mockResolvedValue(
      requiredLegalDocuments,
    );

    const response = await testApp().request(
      '/v1/organization/acceptances/current',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          documents: [
            { documentType: 'terms', documentVersion: '2026-01-01' },
            { documentType: 'dpa', documentVersion: '2026-05-07' },
          ],
        }),
      },
    );

    expect(response.status).toBe(400);
    expect(createOrganizationAcceptance).not.toHaveBeenCalled();
  });
});
