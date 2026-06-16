import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createContactImport,
  createContactSuppression,
  createContact,
  deleteContact,
  deleteContactSuppression,
  deleteContacts,
  failContactImport,
  getCurrentLegalBundle,
  getCurrentOrganizationLegalAcceptance,
  getContactById,
  getContactImportById,
  getOrganizationCountryCode,
  getOrganizationProfileByOrganizationId,
  listContacts,
  suppressContacts,
  updateContact,
} from '@retaino/db';
import type {
  ContactDetail,
  ContactImportDetail,
  LegalBundle,
  LegalDocumentVersion,
  OrganizationLegalAcceptance,
} from '@retaino/shared/contracts';
import { contactsRoutes } from '../../../src/features/contacts/contacts.routes';
import { enqueueContactImportProcessing } from '../../../src/features/contacts/contacts.jobs';
import type { AppEnv } from '../../../src/types';

vi.mock('@retaino/db', () => ({
  createContactSuppression: vi.fn(),
  createContactImport: vi.fn(),
  createContact: vi.fn(),
  deleteContact: vi.fn(),
  deleteContactSuppression: vi.fn(),
  deleteContacts: vi.fn(),
  failContactImport: vi.fn(),
  getCurrentLegalBundle: vi.fn(),
  getCurrentOrganizationLegalAcceptance: vi.fn(),
  getContactById: vi.fn(),
  getContactImportById: vi.fn(),
  getOrganizationCountryCode: vi.fn(),
  getOrganizationProfileByOrganizationId: vi.fn(),
  listContacts: vi.fn(),
  suppressContacts: vi.fn(),
  updateContact: vi.fn(),
}));

vi.mock('../../../src/features/contacts/contacts.jobs', () => ({
  enqueueContactImportProcessing: vi.fn(),
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
  currency: 'SEK',
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
};

const legalDocumentVersions: LegalDocumentVersion[] = [
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    legalDocumentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    documentType: 'terms',
      locale: 'sv',
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
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    legalDocumentId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    documentType: 'dpa',
      locale: 'sv',
    slug: 'dpa',
    title: 'Retaino Data Processing Agreement',
    documentVersion: '2026-05-08',
    effectiveDate: '2026-05-08',
    bodyMdx: '# DPA',
    contentHash: 'b'.repeat(64),
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 20,
    publishedAt: '2026-05-08T00:00:00.000Z',
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  },
];

const legalBundle: LegalBundle = {
  version: '2026-05-09',
  locale: 'sv',
  hash: 'f'.repeat(64),
  documents: legalDocumentVersions.map((document) => ({
    id: document.id,
    legalDocumentId: document.legalDocumentId,
    documentType: document.documentType,
    locale: document.locale,
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
  locale: 'sv',
  bundleVersion: legalBundle.version,
  bundleHash: legalBundle.hash,
  documentsSnapshot: legalBundle.documents,
  ipAddress: '203.0.113.1',
  userAgent: 'vitest',
  acceptedAt: '2026-05-08T00:00:00.000Z',
  acceptedByEmail: user.email,
};

const importDetail: ContactImportDetail = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: organization.id,
  createdByUserId: user.id,
  status: 'processing',
  phoneCountryCode: 'SE',
  totalRows: 0,
  processedRows: 0,
  createdCount: 0,
  updatedCount: 0,
  skippedCount: 0,
  invalidCount: 0,
  duplicateCount: 0,
  suppressedCount: 0,
  errorSummary: [],
  permissionAttestedAt: '2026-05-08T00:00:00.000Z',
  permissionAttestedByUserId: user.id,
  startedAt: '2026-05-08T00:00:00.000Z',
  completedAt: null,
  failedAt: null,
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
};

const contactDetail: ContactDetail = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  organizationId: organization.id,
  name: 'Ada Lovelace',
  phone: '0701234567',
  email: 'ada@example.com',
  normalizedPhone: '+46701234567',
  normalizedEmail: 'ada@example.com',
  lastBookingAt: null,
  lastContactedAt: null,
  consentStatus: 'granted',
  contactStatus: 'ready',
  contactIssues: [],
  suppressions: [],
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
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

  app.route('/v1/contacts', contactsRoutes);
  return app;
}

function env() {
  return {
    CONTACT_IMPORTS_BUCKET: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      delete: vi.fn(),
    },
    INNGEST_EVENT_KEY: 'test',
  };
}

function importForm(input: {
  csv?: string;
  mapping?: Record<string, string>;
  permissionAttestation?: string;
}) {
  const body = new FormData();
  body.set(
    'file',
    new File([input.csv ?? 'Name,Phone\nAda,0701234567\n'], 'contacts.csv', {
      type: 'text/csv',
    }),
  );
  body.set('mapping', JSON.stringify(input.mapping ?? { name: 'Name', phone: 'Phone' }));
  body.set('phoneCountryCode', 'SE');
  if (input.permissionAttestation !== undefined) {
    body.set('permissionAttestation', input.permissionAttestation);
  }

  return body;
}

describe('contactsRoutes', () => {
  beforeEach(() => {
    vi.mocked(createContactSuppression).mockReset();
    vi.mocked(createContactImport).mockReset();
    vi.mocked(createContact).mockReset();
    vi.mocked(deleteContact).mockReset();
    vi.mocked(deleteContactSuppression).mockReset();
    vi.mocked(deleteContacts).mockReset();
    vi.mocked(failContactImport).mockReset();
    vi.mocked(getCurrentLegalBundle).mockReset();
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockReset();
    vi.mocked(getContactById).mockReset();
    vi.mocked(getContactImportById).mockReset();
    vi.mocked(getOrganizationCountryCode).mockReset();
    vi.mocked(getOrganizationProfileByOrganizationId).mockReset();
    vi.mocked(listContacts).mockReset();
    vi.mocked(suppressContacts).mockReset();
    vi.mocked(updateContact).mockReset();
    vi.mocked(enqueueContactImportProcessing).mockReset();
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(profile);
    vi.mocked(getCurrentLegalBundle).mockResolvedValue(legalBundle);
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockResolvedValue(legalAcceptance);
    vi.mocked(getOrganizationCountryCode).mockResolvedValue('SE');
  });

  it('lets members start a one-step CSV import and enqueue processing', async () => {
    vi.mocked(createContactImport).mockResolvedValue(importDetail);
    const testEnv = env();

    const response = await testApp({ role: 'org:member' }).request(
      '/v1/contacts/imports',
      {
        method: 'POST',
        body: importForm({ permissionAttestation: 'true' }),
      },
      testEnv,
    );

    expect(response.status).toBe(202);
    expect(testEnv.CONTACT_IMPORTS_BUCKET.put).toHaveBeenCalled();
    expect(createContactImport).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      createdByUserId: user.id,
      fileKey: expect.stringContaining(
        `organizations/${organization.id}/contact-imports/`,
      ),
      fileName: 'contacts.csv',
      fileSize: expect.any(Number),
      mapping: { name: 'Name', phone: 'Phone' },
      phoneCountryCode: 'SE',
      permissionAttestedByUserId: user.id,
      userAgent: null,
    });
    expect(enqueueContactImportProcessing).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactImportId: importDetail.id,
      userId: user.id,
    });
  });

  it('rejects malformed CSV before storing an import file', async () => {
    const testEnv = env();
    const response = await testApp().request(
      '/v1/contacts/imports',
      {
        method: 'POST',
        body: importForm({
          csv: 'Name,Phone\n"Ada,0701234567\n',
          permissionAttestation: 'true',
        }),
      },
      testEnv,
    );

    expect(response.status).toBe(400);
    expect(testEnv.CONTACT_IMPORTS_BUCKET.put).not.toHaveBeenCalled();
    expect(createContactImport).not.toHaveBeenCalled();
  });

  it('rejects oversized uploads before storing an import file', async () => {
    const testEnv = env();
    const response = await testApp().request(
      '/v1/contacts/imports',
      {
        method: 'POST',
        headers: {
          'content-length': String(27 * 1024 * 1024),
        },
        body: importForm({ permissionAttestation: 'true' }),
      },
      testEnv,
    );

    expect(response.status).toBe(400);
    expect(testEnv.CONTACT_IMPORTS_BUCKET.put).not.toHaveBeenCalled();
    expect(createContactImport).not.toHaveBeenCalled();
  });

  it('cleans up the temporary file if enqueueing fails', async () => {
    vi.mocked(createContactImport).mockResolvedValue(importDetail);
    vi.mocked(enqueueContactImportProcessing).mockRejectedValue(
      new Error('queue down'),
    );
    const testEnv = env();

    const response = await testApp().request(
      '/v1/contacts/imports',
      {
        method: 'POST',
        body: importForm({ permissionAttestation: 'true' }),
      },
      testEnv,
    );

    expect(response.status).toBe(500);
    expect(testEnv.CONTACT_IMPORTS_BUCKET.delete).toHaveBeenCalledWith(
      expect.stringContaining(`organizations/${organization.id}/contact-imports/`),
    );
    expect(failContactImport).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactImportId: importDetail.id,
      error: 'queue down',
    });
  });

  it('rejects invalid mappings and missing attestation', async () => {
    const invalidMapping = await testApp().request(
      '/v1/contacts/imports',
      {
        method: 'POST',
        body: importForm({
          mapping: { phone: 'Phone', lastService: 'Service' },
          permissionAttestation: 'true',
        }),
      },
      env(),
    );
    const missingAttestation = await testApp().request(
      '/v1/contacts/imports',
      {
        method: 'POST',
        body: importForm({}),
      },
      env(),
    );

    expect(invalidMapping.status).toBe(400);
    expect(missingAttestation.status).toBe(400);
    expect(createContactImport).not.toHaveBeenCalled();
  });

  it('rejects import start for blocked organizations', async () => {
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValueOnce(null);
    const incomplete = await testApp().request(
      '/v1/contacts/imports',
      {
        method: 'POST',
        body: importForm({ permissionAttestation: 'true' }),
      },
      env(),
    );

    expect(incomplete.status).toBe(403);
    expect(createContactImport).not.toHaveBeenCalled();
  });

  it('polls the current import job by id', async () => {
    vi.mocked(getContactImportById).mockResolvedValue(importDetail);

    const response = await testApp().request(
      `/v1/contacts/imports/${importDetail.id}`,
      undefined,
      env(),
    );

    expect(response.status).toBe(200);
    expect(getContactImportById).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactImportId: importDetail.id,
    });
  });

  it('passes contact list filters to the query layer', async () => {
    vi.mocked(listContacts).mockResolvedValue({
      contacts: [contactDetail],
      page: 1,
      pageSize: 25,
      total: 1,
    });

    const response = await testApp().request(
      '/v1/contacts?issue=suppressed_phone&sort=name&direction=asc',
      undefined,
      env(),
    );

    expect(response.status).toBe(200);
    expect(listContacts).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      query: {
        page: 1,
        pageSize: 25,
        issue: 'suppressed_phone',
        sort: 'name',
        direction: 'asc',
      },
    });
  });

  it('lets members update and delete contacts', async () => {
    vi.mocked(updateContact).mockResolvedValue({
      status: 'updated',
      contact: { ...contactDetail, name: 'Grace Hopper' },
    });
    vi.mocked(deleteContact).mockResolvedValue(true);

    const update = await testApp({ role: 'org:member' }).request(
      `/v1/contacts/${contactDetail.id}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Grace Hopper', phoneCountryCode: 'SE' }),
      },
      env(),
    );
    const deleted = await testApp({ role: 'org:member' }).request(
      `/v1/contacts/${contactDetail.id}`,
      { method: 'DELETE' },
      env(),
    );

    expect(update.status).toBe(200);
    expect(deleted.status).toBe(204);
    expect(deleteContact).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactId: contactDetail.id,
      actorUserId: user.id,
      userAgent: null,
    });
  });

  it('lets members bulk delete selected contacts', async () => {
    vi.mocked(deleteContacts).mockResolvedValue(2);
    const contactIds = [
      contactDetail.id,
      '33333333-3333-4333-8333-333333333333',
    ];

    const response = await testApp({ role: 'org:member' }).request(
      '/v1/contacts/bulk-delete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contactIds }),
      },
      env(),
    );

    expect(response.status).toBe(200);
    expect(deleteContacts).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactIds,
      actorUserId: user.id,
      userAgent: null,
    });
    await expect(response.json()).resolves.toEqual({
      requestedCount: 2,
      affectedCount: 2,
      skippedCount: 0,
    });
  });

  it('lets members bulk suppress selected contacts', async () => {
    vi.mocked(suppressContacts).mockResolvedValue({
      affectedCount: 1,
      skippedCount: 1,
    });
    const contactIds = [
      contactDetail.id,
      '33333333-3333-4333-8333-333333333333',
    ];

    const response = await testApp({ role: 'org:member' }).request(
      '/v1/contacts/bulk-suppressions',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contactIds, type: 'phone' }),
      },
      env(),
    );

    expect(response.status).toBe(200);
    expect(suppressContacts).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactIds,
      type: 'phone',
    });
    await expect(response.json()).resolves.toEqual({
      requestedCount: 2,
      affectedCount: 1,
      skippedCount: 1,
    });
  });

  it('rejects invalid bulk contact payloads', async () => {
    const deleted = await testApp().request(
      '/v1/contacts/bulk-delete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contactIds: [] }),
      },
      env(),
    );
    const suppressed = await testApp().request(
      '/v1/contacts/bulk-suppressions',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contactIds: [contactDetail.id], type: 'email' }),
      },
      env(),
    );

    expect(deleted.status).toBe(400);
    expect(suppressed.status).toBe(400);
    expect(deleteContacts).not.toHaveBeenCalled();
    expect(suppressContacts).not.toHaveBeenCalled();
  });

  it('lets members manage contact suppressions', async () => {
    vi.mocked(createContactSuppression).mockResolvedValue({
      status: 'created',
      contact: {
        ...contactDetail,
        contactStatus: 'blocked',
        contactIssues: ['suppressed_phone'],
      },
    });
    vi.mocked(deleteContactSuppression).mockResolvedValue({
      status: 'deleted',
      contact: contactDetail,
    });

    const created = await testApp({ role: 'org:member' }).request(
      `/v1/contacts/${contactDetail.id}/suppressions`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'phone' }),
      },
      env(),
    );
    const deleted = await testApp({ role: 'org:member' }).request(
      `/v1/contacts/${contactDetail.id}/suppressions/33333333-3333-4333-8333-333333333333`,
      { method: 'DELETE' },
      env(),
    );

    expect(created.status).toBe(201);
    expect(deleted.status).toBe(200);
    expect(deleteContactSuppression).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactId: contactDetail.id,
      suppressionId: '33333333-3333-4333-8333-333333333333',
      actorUserId: user.id,
      userAgent: null,
    });
  });

  it('lets members create a single contact', async () => {
    vi.mocked(createContact).mockResolvedValue({
      status: 'created',
      contact: contactDetail,
    });

    const response = await testApp({ role: 'org:member' }).request(
      '/v1/contacts',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'vitest',
        },
        body: JSON.stringify({
          name: 'Ada Lovelace',
          phone: '0701234567',
          email: 'ada@example.com',
          phoneCountryCode: 'SE',
          lastBookingAt: null,
          marketingSmsAllowed: true,
        }),
      },
      env(),
    );

    expect(response.status).toBe(201);
    expect(createContact).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      actorUserId: user.id,
      input: {
        name: 'Ada Lovelace',
        phone: '0701234567',
        email: 'ada@example.com',
        phoneCountryCode: 'SE',
        lastBookingAt: null,
        marketingSmsAllowed: true,
      },
      userAgent: 'vitest',
    });
    await expect(response.json()).resolves.toEqual({ contact: contactDetail });
  });

  it('rejects invalid and duplicate single contacts', async () => {
    const missingPhone = await testApp().request(
      '/v1/contacts',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Ada Lovelace',
          phoneCountryCode: 'SE',
          marketingSmsAllowed: true,
        }),
      },
      env(),
    );

    vi.mocked(createContact).mockResolvedValueOnce({ status: 'duplicate' });
    const duplicate = await testApp().request(
      '/v1/contacts',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          phone: '0701234567',
          phoneCountryCode: 'SE',
          marketingSmsAllowed: true,
        }),
      },
      env(),
    );

    expect(missingPhone.status).toBe(400);
    expect(duplicate.status).toBe(409);
  });

  it('rejects single contact creation for blocked organizations', async () => {
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValueOnce(null);

    const response = await testApp().request(
      '/v1/contacts',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          phone: '0701234567',
          phoneCountryCode: 'SE',
          marketingSmsAllowed: false,
        }),
      },
      env(),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        message: 'Organization setup must be complete before adding contacts.',
      },
    });
    expect(createContact).not.toHaveBeenCalled();
  });
});
