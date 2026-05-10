import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createContactImport,
  createContactSuppression,
  deleteContact,
  deleteContactSuppression,
  getCurrentRequiredLegalDocumentVersions,
  getContactById,
  getContactImportById,
  getOrganizationCountryCode,
  getOrganizationProfileByOrganizationId,
  listContactImportRows,
  listContactImports,
  listContacts,
  listOrganizationAcceptedDocuments,
  markContactImportProcessing,
  updateContact,
} from '@retaino/db';
import type {
  ContactDetail,
  ContactImportDetail,
  LegalDocumentVersion,
} from '@retaino/shared/contracts';
import { contactsRoutes } from './contacts.routes';
import { enqueueContactImportProcessing } from './contacts.jobs';
import type { AppEnv } from '../../types';

vi.mock('@retaino/db', () => ({
  createContactSuppression: vi.fn(),
  createContactImport: vi.fn(),
  deleteContact: vi.fn(),
  deleteContactSuppression: vi.fn(),
  getCurrentRequiredLegalDocumentVersions: vi.fn(),
  getContactById: vi.fn(),
  getContactImportById: vi.fn(),
  getOrganizationCountryCode: vi.fn(),
  getOrganizationProfileByOrganizationId: vi.fn(),
  listContactImportRows: vi.fn(),
  listContactImports: vi.fn(),
  listContacts: vi.fn(),
  listOrganizationAcceptedDocuments: vi.fn(),
  markContactImportProcessing: vi.fn(),
  updateContact: vi.fn(),
}));

vi.mock('./contacts.jobs', () => ({
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

const requiredLegalDocuments: LegalDocumentVersion[] = [
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
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    legalDocumentId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    documentType: 'dpa',
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
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    legalDocumentId: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    documentType: 'subprocessors',
    slug: 'subprocessors',
    title: 'Subprocessors',
    documentVersion: '2026-05-08',
    effectiveDate: '2026-05-08',
    bodyMdx: '# Subprocessors',
    contentHash: 'c'.repeat(64),
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 30,
    publishedAt: '2026-05-08T00:00:00.000Z',
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    legalDocumentId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    documentType: 'transfer_terms',
    slug: 'transfer_terms',
    title: 'Transfer Terms',
    documentVersion: '2026-05-08',
    effectiveDate: '2026-05-08',
    bodyMdx: '# Transfer Terms',
    contentHash: 'd'.repeat(64),
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 40,
    publishedAt: '2026-05-08T00:00:00.000Z',
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  },
  {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    legalDocumentId: 'ffffffff-ffff-4fff-8fff-fffffffffff1',
    documentType: 'sending_policy',
    slug: 'sending_policy',
    title: 'Sending Policy',
    documentVersion: '2026-05-08',
    effectiveDate: '2026-05-08',
    bodyMdx: '# Sending Policy',
    contentHash: 'e'.repeat(64),
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 50,
    publishedAt: '2026-05-08T00:00:00.000Z',
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    legalDocumentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    documentType: 'campaign_attestation',
    slug: 'campaign_attestation',
    title: 'Campaign Attestation',
    documentVersion: '2026-05-08',
    effectiveDate: '2026-05-08',
    bodyMdx: '# Campaign Attestation',
    contentHash: 'f'.repeat(64),
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 60,
    publishedAt: '2026-05-08T00:00:00.000Z',
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  },
];

const importDetail: ContactImportDetail = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: organization.id,
  createdByUserId: user.id,
  status: 'uploaded',
  filename: 'contacts.csv',
  fileSize: 60,
  contentType: 'text/csv',
  source: null,
  phoneCountryCode: 'SE',
  mapping: null,
  preview: {
    headers: ['Name', 'Phone'],
    sampleRows: [{ Name: 'Ada Lovelace', Phone: '0701234567' }],
    warnings: [],
  },
  totalRows: 0,
  processedRows: 0,
  createdCount: 0,
  updatedCount: 0,
  skippedCount: 0,
  invalidCount: 0,
  duplicateCount: 0,
  suppressedCount: 0,
  errorSummary: [],
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
  lastService: 'Cut',
  consentStatus: 'granted',
  source: 'csv',
  createdFromImportId: importDetail.id,
  lastImportId: importDetail.id,
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

  app.route('/v1', contactsRoutes);
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

describe('contactsRoutes', () => {
  beforeEach(() => {
    vi.mocked(createContactSuppression).mockReset();
    vi.mocked(createContactImport).mockReset();
    vi.mocked(deleteContact).mockReset();
    vi.mocked(deleteContactSuppression).mockReset();
    vi.mocked(getCurrentRequiredLegalDocumentVersions).mockReset();
    vi.mocked(getContactById).mockReset();
    vi.mocked(getContactImportById).mockReset();
    vi.mocked(getOrganizationCountryCode).mockReset();
    vi.mocked(getOrganizationProfileByOrganizationId).mockReset();
    vi.mocked(listContactImportRows).mockReset();
    vi.mocked(listContactImports).mockReset();
    vi.mocked(listContacts).mockReset();
    vi.mocked(listOrganizationAcceptedDocuments).mockReset();
    vi.mocked(markContactImportProcessing).mockReset();
    vi.mocked(updateContact).mockReset();
    vi.mocked(enqueueContactImportProcessing).mockReset();
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(profile);
    vi.mocked(getCurrentRequiredLegalDocumentVersions).mockResolvedValue(
      requiredLegalDocuments,
    );
    vi.mocked(listOrganizationAcceptedDocuments).mockResolvedValue([
      {
        documentType: 'terms',
        documentVersion: '2026-05-08',
        legalDocumentVersionId: '55555555-5555-4555-8555-555555555555',
        contentHash: 'a'.repeat(64),
      },
      {
        documentType: 'dpa',
        documentVersion: '2026-05-08',
        legalDocumentVersionId: '66666666-6666-4666-8666-666666666666',
        contentHash: 'b'.repeat(64),
      },
      {
        documentType: 'subprocessors',
        documentVersion: '2026-05-08',
        legalDocumentVersionId: '77777777-7777-4777-8777-777777777777',
        contentHash: 'c'.repeat(64),
      },
      {
        documentType: 'transfer_terms',
        documentVersion: '2026-05-08',
        legalDocumentVersionId: '88888888-8888-4888-8888-888888888888',
        contentHash: 'd'.repeat(64),
      },
      {
        documentType: 'sending_policy',
        documentVersion: '2026-05-08',
        legalDocumentVersionId: '99999999-9999-4999-8999-999999999999',
        contentHash: 'e'.repeat(64),
      },
      {
        documentType: 'campaign_attestation',
        documentVersion: '2026-05-08',
        legalDocumentVersionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        contentHash: 'f'.repeat(64),
      },
    ]);
  });

  it('uploads a CSV, stores it in R2, and returns preview rows only', async () => {
    vi.mocked(getOrganizationCountryCode).mockResolvedValue('SE');
    vi.mocked(createContactImport).mockResolvedValue(importDetail);
    const body = new FormData();
    body.set(
      'file',
      new File(
        [
          'Name,Phone\nAda Lovelace,0701234567\nGrace Hopper,0707654321\n',
        ],
        'contacts.csv',
        { type: 'text/csv' },
      ),
    );

    const testEnv = env();
    const response = await testApp().request(
      '/v1/contact-imports',
      { method: 'POST', body },
      testEnv,
    );

    expect(response.status).toBe(201);
    expect(testEnv.CONTACT_IMPORTS_BUCKET.put).toHaveBeenCalled();
    expect(createContactImport).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      createdByUserId: user.id,
      fileKey: expect.stringContaining(
        `organizations/${organization.id}/contact-imports/`,
      ),
      filename: 'contacts.csv',
      fileSize: expect.any(Number),
      contentType: 'text/csv',
      checksum: expect.any(String),
      source: null,
      phoneCountryCode: 'SE',
      preview: {
        headers: ['Name', 'Phone'],
        sampleRows: [
          { Name: 'Ada Lovelace', Phone: '0701234567' },
          { Name: 'Grace Hopper', Phone: '0707654321' },
        ],
        warnings: [],
      },
    });
  });

  it('rejects malformed CSV before storing an import file', async () => {
    const body = new FormData();
    const testEnv = env();
    body.set(
      'file',
      new File(['Name,Phone\n"Ada,0701234567\n'], 'contacts.csv', {
        type: 'text/csv',
      }),
    );

    const response = await testApp().request(
      '/v1/contact-imports',
      { method: 'POST', body },
      testEnv,
    );

    expect(response.status).toBe(400);
    expect(testEnv.CONTACT_IMPORTS_BUCKET.put).not.toHaveBeenCalled();
    expect(createContactImport).not.toHaveBeenCalled();
  });

  it('detects headers and sensitive-column warnings without data rows', async () => {
    vi.mocked(getOrganizationCountryCode).mockResolvedValue('SE');
    vi.mocked(createContactImport).mockResolvedValue({
      ...importDetail,
      preview: {
        headers: ['Name', 'Phone'],
        sampleRows: [],
        warnings: ['Unsupported sensitive column ignored: Journal notes'],
      },
    });
    const body = new FormData();
    body.set(
      'file',
      new File(['Name,Phone,Journal notes\n'], 'contacts.csv', {
        type: 'text/csv',
      }),
    );

    const response = await testApp().request(
      '/v1/contact-imports',
      { method: 'POST', body },
      env(),
    );

    expect(response.status).toBe(201);
    expect(createContactImport).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        preview: {
          headers: ['Name', 'Phone'],
          sampleRows: [],
          warnings: ['Unsupported sensitive column ignored: Journal notes'],
        },
      }),
    );
  });

  it('drops sensitive columns from persisted preview sample rows', async () => {
    vi.mocked(getOrganizationCountryCode).mockResolvedValue('SE');
    vi.mocked(createContactImport).mockResolvedValue({
      ...importDetail,
      preview: {
        headers: ['Name', 'Phone'],
        sampleRows: [{ Name: 'Ada Lovelace', Phone: '0701234567' }],
        warnings: ['Unsupported sensitive column ignored: Journal notes'],
      },
    });
    const body = new FormData();
    body.set(
      'file',
      new File(
        [
          'Name,Phone,Journal notes\nAda Lovelace,0701234567,medical note\n',
        ],
        'contacts.csv',
        { type: 'text/csv' },
      ),
    );

    const response = await testApp().request(
      '/v1/contact-imports',
      { method: 'POST', body },
      env(),
    );

    expect(response.status).toBe(201);
    expect(createContactImport).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        preview: {
          headers: ['Name', 'Phone'],
          sampleRows: [{ Name: 'Ada Lovelace', Phone: '0701234567' }],
          warnings: ['Unsupported sensitive column ignored: Journal notes'],
        },
      }),
    );
  });

  it('rejects upload when organization setup is incomplete', async () => {
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(null);
    const body = new FormData();
    body.set('file', new File(['Name\nAda\n'], 'contacts.csv'));

    const response = await testApp().request(
      '/v1/contact-imports',
      { method: 'POST', body },
      env(),
    );

    expect(response.status).toBe(403);
    expect(createContactImport).not.toHaveBeenCalled();
  });

  it('rejects upload when a required document has an older accepted version', async () => {
    vi.mocked(listOrganizationAcceptedDocuments).mockResolvedValue([
      {
        documentType: 'terms',
        documentVersion: '2026-01-01',
        legalDocumentVersionId: '55555555-5555-4555-8555-555555555555',
        contentHash: 'a'.repeat(64),
      },
      ...requiredLegalDocuments.slice(1).map((document, index) => ({
        documentType: document.documentType,
        documentVersion: document.documentVersion,
        legalDocumentVersionId: `${index + 1}`.repeat(36).slice(0, 36),
        contentHash: String(index + 1).repeat(64),
      })),
    ]);
    const body = new FormData();
    body.set('file', new File(['Name\nAda\n'], 'contacts.csv'));

    const response = await testApp().request(
      '/v1/contact-imports',
      { method: 'POST', body },
      env(),
    );

    expect(response.status).toBe(403);
    expect(createContactImport).not.toHaveBeenCalled();
  });

  it('rejects upload for organization members', async () => {
    const body = new FormData();
    body.set('file', new File(['Name\nAda\n'], 'contacts.csv'));

    const response = await testApp({ role: 'org:member' }).request(
      '/v1/contact-imports',
      { method: 'POST', body },
      env(),
    );

    expect(response.status).toBe(403);
    expect(createContactImport).not.toHaveBeenCalled();
  });

  it('validates mapping, stores phoneCountryCode, and emits the process event', async () => {
    vi.mocked(markContactImportProcessing).mockResolvedValue({
      status: 'updated',
      import: {
        ...importDetail,
        status: 'processing',
        mapping: { name: 'Name', phone: 'Phone' },
      },
    });

    const response = await testApp().request(
      `/v1/contact-imports/${importDetail.id}/process`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mapping: { name: 'Name', phone: 'Phone' },
          phoneCountryCode: 'SE',
        }),
      },
      env(),
    );

    expect(response.status).toBe(202);
    expect(markContactImportProcessing).toHaveBeenCalledWith(
      expect.anything(),
      {
        organizationId: organization.id,
        contactImportId: importDetail.id,
        mapping: { name: 'Name', phone: 'Phone' },
        phoneCountryCode: 'SE',
      },
    );
    expect(enqueueContactImportProcessing).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactImportId: importDetail.id,
      userId: user.id,
    });
  });

  it('rejects processing when an import has already started', async () => {
    vi.mocked(markContactImportProcessing).mockResolvedValue({
      status: 'invalid_status',
      import: { ...importDetail, status: 'processing' },
    });

    const response = await testApp().request(
      `/v1/contact-imports/${importDetail.id}/process`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mapping: { name: 'Name', phone: 'Phone' },
          phoneCountryCode: 'SE',
        }),
      },
      env(),
    );

    expect(response.status).toBe(409);
    expect(enqueueContactImportProcessing).not.toHaveBeenCalled();
  });

  it('returns not found when processing a missing import', async () => {
    vi.mocked(markContactImportProcessing).mockResolvedValue({
      status: 'not_found',
    });

    const response = await testApp().request(
      `/v1/contact-imports/${importDetail.id}/process`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mapping: { name: 'Name', phone: 'Phone' },
          phoneCountryCode: 'SE',
        }),
      },
      env(),
    );

    expect(response.status).toBe(404);
    expect(enqueueContactImportProcessing).not.toHaveBeenCalled();
  });

  it('returns computed contact status from the contacts list', async () => {
    vi.mocked(listContacts).mockResolvedValue({
      contacts: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          organizationId: organization.id,
          name: 'Ada Lovelace',
          phone: '0701234567',
          email: null,
          normalizedPhone: '+46701234567',
          normalizedEmail: null,
          lastBookingAt: null,
          lastContactedAt: null,
          lastService: null,
          consentStatus: 'granted',
          source: 'csv',
          createdFromImportId: importDetail.id,
          lastImportId: importDetail.id,
          contactStatus: 'ready',
          contactIssues: [],
          createdAt: '2026-05-08T00:00:00.000Z',
          updatedAt: '2026-05-08T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    });

    const response = await testApp().request(
      `/v1/contacts?issue=suppressed_phone&importedFrom=${importDetail.id}&sort=name&direction=asc`,
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
        importedFrom: importDetail.id,
        sort: 'name',
        direction: 'asc',
      },
    });
    await expect(response.json()).resolves.toMatchObject({
      contacts: [{ contactStatus: 'ready', contactIssues: [] }],
    });
  });

  it('returns row-level import errors by status filter', async () => {
    vi.mocked(listContactImportRows).mockResolvedValue({
      rows: [
        {
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          organizationId: organization.id,
          contactImportId: importDetail.id,
          rowNumber: 2,
          status: 'invalid',
          contactId: null,
          rawValues: { Phone: '123' },
          normalizedValues: {},
          errors: ['invalid_phone'],
          createdAt: '2026-05-08T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    });

    const response = await testApp().request(
      `/v1/contact-imports/${importDetail.id}/rows?status=invalid`,
      undefined,
      env(),
    );

    expect(response.status).toBe(200);
    expect(listContactImportRows).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactImportId: importDetail.id,
      query: { page: 1, pageSize: 25, status: 'invalid' },
    });
  });

  it('returns a contact detail by id', async () => {
    vi.mocked(getContactById).mockResolvedValue(contactDetail);

    const response = await testApp().request(
      `/v1/contacts/${contactDetail.id}`,
      undefined,
      env(),
    );

    expect(response.status).toBe(200);
    expect(getContactById).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactId: contactDetail.id,
    });
    await expect(response.json()).resolves.toMatchObject({
      contact: { id: contactDetail.id, suppressions: [] },
    });
  });

  it('returns not found for a missing contact detail', async () => {
    vi.mocked(getContactById).mockResolvedValue(null);

    const response = await testApp().request(
      `/v1/contacts/${contactDetail.id}`,
      undefined,
      env(),
    );

    expect(response.status).toBe(404);
  });

  it('updates a contact for organization admins', async () => {
    vi.mocked(updateContact).mockResolvedValue({ status: 'updated', contact: {
      ...contactDetail,
      name: 'Grace Hopper',
    } });

    const response = await testApp().request(
      `/v1/contacts/${contactDetail.id}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Grace Hopper',
          consentStatus: 'granted',
          phoneCountryCode: 'SE',
        }),
      },
      env(),
    );

    expect(response.status).toBe(200);
    expect(updateContact).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactId: contactDetail.id,
      input: {
        name: 'Grace Hopper',
        consentStatus: 'granted',
        phoneCountryCode: 'SE',
      },
    });
  });

  it('rejects contact updates for organization members', async () => {
    const response = await testApp({ role: 'org:member' }).request(
      `/v1/contacts/${contactDetail.id}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Grace Hopper' }),
      },
      env(),
    );

    expect(response.status).toBe(403);
    expect(updateContact).not.toHaveBeenCalled();
  });

  it('returns conflict when updating a duplicate contact method', async () => {
    vi.mocked(updateContact).mockResolvedValue({ status: 'duplicate' });

    const response = await testApp().request(
      `/v1/contacts/${contactDetail.id}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'ada@example.com' }),
      },
      env(),
    );

    expect(response.status).toBe(409);
  });

  it('creates a selected contact suppression for organization admins', async () => {
    vi.mocked(createContactSuppression).mockResolvedValue({
      status: 'created',
      contact: {
        ...contactDetail,
        contactStatus: 'blocked',
        contactIssues: ['suppressed_phone'],
      },
    });

    const response = await testApp().request(
      `/v1/contacts/${contactDetail.id}/suppressions`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'phone' }),
      },
      env(),
    );

    expect(response.status).toBe(201);
    expect(createContactSuppression).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactId: contactDetail.id,
      type: 'phone',
    });
  });

  it('removes a selected contact suppression for organization admins', async () => {
    vi.mocked(deleteContactSuppression).mockResolvedValue({
      status: 'deleted',
      contact: contactDetail,
    });

    const response = await testApp().request(
      `/v1/contacts/${contactDetail.id}/suppressions/33333333-3333-4333-8333-333333333333`,
      { method: 'DELETE' },
      env(),
    );

    expect(response.status).toBe(200);
    expect(deleteContactSuppression).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactId: contactDetail.id,
      suppressionId: '33333333-3333-4333-8333-333333333333',
    });
    await expect(response.json()).resolves.toMatchObject({
      contact: { id: contactDetail.id, suppressions: [] },
    });
  });

  it('hard deletes a contact for organization admins', async () => {
    vi.mocked(deleteContact).mockResolvedValue(true);

    const response = await testApp().request(
      `/v1/contacts/${contactDetail.id}`,
      { method: 'DELETE' },
      env(),
    );

    expect(response.status).toBe(204);
    expect(deleteContact).toHaveBeenCalledWith(expect.anything(), {
      organizationId: organization.id,
      contactId: contactDetail.id,
    });
  });
});
