import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeContactImport,
  failContactImport,
  findSuppressionByHash,
  getContactImportForProcessing,
  upsertImportedContact,
} from '@retaino/db';
import { processContactImport } from '../../../src/features/contacts/contacts.service';

vi.mock('@retaino/db', () => ({
  completeContactImport: vi.fn(),
  failContactImport: vi.fn(),
  findSuppressionByHash: vi.fn(),
  getContactImportForProcessing: vi.fn(),
  upsertImportedContact: vi.fn(),
}));

const organizationId = '22222222-2222-4222-8222-222222222222';
const contactImportId = '44444444-4444-4444-8444-444444444444';

function bucket(csv: string) {
  return {
    get: vi.fn().mockResolvedValue({
      arrayBuffer: async () => new TextEncoder().encode(csv).buffer,
    }),
    put: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as R2Bucket;
}

function importRecord() {
  return {
    id: contactImportId,
    organizationId,
    status: 'processing' as const,
    fileKey: 'source.csv',
    mapping: {
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      lastBookingAt: 'Last booking',
    },
    phoneCountryCode: 'SE',
  };
}

describe('processContactImport', () => {
  beforeEach(() => {
    vi.mocked(completeContactImport).mockReset();
    vi.mocked(failContactImport).mockReset();
    vi.mocked(findSuppressionByHash).mockReset();
    vi.mocked(getContactImportForProcessing).mockReset();
    vi.mocked(upsertImportedContact).mockReset();
    vi.mocked(getContactImportForProcessing).mockResolvedValue(importRecord());
    vi.mocked(findSuppressionByHash).mockResolvedValue(null);
    vi.mocked(upsertImportedContact).mockResolvedValue({
      action: 'created',
      contact: {
        id: '55555555-5555-4555-8555-555555555555',
        organizationId,
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
        createdAt: '2026-05-08T00:00:00.000Z',
        updatedAt: '2026-05-08T00:00:00.000Z',
      },
    });
  });

  it('creates contacts from valid rows and stores aggregate counts', async () => {
    const r2 = bucket(
      'Name,Phone,Email,Last booking,Service,Source\nAda Lovelace,0701234567,ada@example.com,2026-01-02,Cut,booking\n',
    );

    await processContactImport({
      db: {} as never,
      bucket: r2,
      organizationId,
      contactImportId,
    });

    expect(upsertImportedContact).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      contactImportId,
      name: 'Ada Lovelace',
      phone: '0701234567',
      email: 'ada@example.com',
      normalizedPhone: '+46701234567',
      normalizedEmail: 'ada@example.com',
      phoneHash: expect.any(String),
      emailHash: expect.any(String),
      lastBookingAt: new Date('2026-01-02T00:00:00.000Z'),
      consentStatus: 'granted',
    });
    expect(completeContactImport).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      contactImportId,
      counts: {
        totalRows: 1,
        processedRows: 1,
        createdCount: 1,
        updatedCount: 0,
        skippedCount: 0,
        invalidCount: 0,
        duplicateCount: 0,
        suppressedCount: 0,
        errorSummary: [],
      },
    });
    expect(r2.delete).toHaveBeenCalledWith('source.csv');
  });

  it('counts invalid, duplicate, suppressed, and conflicting rows without row persistence', async () => {
    const suppression = {
      id: '66666666-6666-4666-8666-666666666666',
      organizationId,
      type: 'phone' as const,
      value: '+46700000000',
      normalizedValue: '+46700000000',
      valueHash: 'hash',
      reason: 'opt_out',
      source: null,
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
    };
    vi.mocked(findSuppressionByHash)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(suppression)
      .mockResolvedValue(null);
    vi.mocked(upsertImportedContact)
      .mockResolvedValueOnce({ action: 'created', contact: null })
      .mockResolvedValueOnce({ action: 'conflict', contact: null });

    await processContactImport({
      db: {} as never,
      bucket: bucket(
        'Name,Phone,Email,Last booking\nValid,0701234567,,\nInvalid,123,,\nDupe,0701234567,,\nSuppressed,0700000000,,\nConflict,0701111111,ada@example.com,\n',
      ),
      organizationId,
      contactImportId,
    });

    expect(completeContactImport).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      contactImportId,
      counts: expect.objectContaining({
        totalRows: 5,
        processedRows: 5,
        createdCount: 1,
        skippedCount: 1,
        invalidCount: 1,
        duplicateCount: 1,
        suppressedCount: 1,
        errorSummary: [
          'invalid_phone',
          'duplicate_contact_method',
          'suppressed_contact_method',
          'conflicting_contact_methods',
        ],
      }),
    });
  });

  it('marks the import failed and still deletes the temporary file when processing throws', async () => {
    vi.mocked(upsertImportedContact).mockRejectedValue(new Error('database down'));
    const r2 = bucket('Name,Phone\nAda,0701234567\n');

    await processContactImport({
      db: {} as never,
      bucket: r2,
      organizationId,
      contactImportId,
    });

    expect(failContactImport).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      contactImportId,
      error: 'database down',
    });
    expect(r2.delete).toHaveBeenCalledWith('source.csv');
  });
});
