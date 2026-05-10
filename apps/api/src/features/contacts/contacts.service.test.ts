import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeContactImportFromRows,
  failContactImport,
  findSuppressionByHash,
  getContactImportForProcessing,
  upsertContactImportRow,
  upsertImportedContact,
} from '@retaino/db';
import { processContactImport } from './contacts.service';

vi.mock('@retaino/db', () => ({
  completeContactImportFromRows: vi.fn(),
  failContactImport: vi.fn(),
  findSuppressionByHash: vi.fn(),
  getContactImportForProcessing: vi.fn(),
  upsertContactImportRow: vi.fn(),
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
    delete: vi.fn(),
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
      lastService: 'Service',
      consentStatus: 'Consent',
      source: 'Source',
    },
    phoneCountryCode: 'SE',
  };
}

describe('processContactImport', () => {
  beforeEach(() => {
    vi.mocked(completeContactImportFromRows).mockReset();
    vi.mocked(failContactImport).mockReset();
    vi.mocked(findSuppressionByHash).mockReset();
    vi.mocked(getContactImportForProcessing).mockReset();
    vi.mocked(upsertContactImportRow).mockReset();
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
        lastService: null,
        consentStatus: 'granted',
        source: 'csv',
        createdFromImportId: contactImportId,
        lastImportId: contactImportId,
        contactStatus: 'ready',
        contactIssues: [],
        createdAt: '2026-05-08T00:00:00.000Z',
        updatedAt: '2026-05-08T00:00:00.000Z',
      },
    });
  });

  it('creates contacts from valid rows and stores final counts', async () => {
    await processContactImport({
      db: {} as never,
      bucket: bucket(
        'Name,Phone,Email,Last booking,Service,Consent,Source\nAda Lovelace,0701234567,ada@example.com,2026-01-02,Cut,yes,booking\n',
      ),
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
      lastService: 'Cut',
      consentStatus: 'granted',
      source: 'booking',
    });
    expect(upsertContactImportRow).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      contactImportId,
      rowNumber: 2,
      status: 'created',
      contactId: '55555555-5555-4555-8555-555555555555',
      rawValues: {},
      normalizedValues: {
        phone: '+46701234567',
        email: 'ada@example.com',
      },
      errors: [],
    });
    expect(completeContactImportFromRows).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      contactImportId,
    });
  });

  it('updates existing contacts instead of duplicating them', async () => {
    vi.mocked(upsertImportedContact).mockResolvedValue({
      action: 'updated',
      contact: null,
    });

    await processContactImport({
      db: {} as never,
      bucket: bucket('Name,Phone,Email,Consent\nAda,0701234567,,yes\n'),
      organizationId,
      contactImportId,
    });

    expect(completeContactImportFromRows).toHaveBeenCalledWith(
      expect.anything(),
      { organizationId, contactImportId },
    );
    expect(upsertContactImportRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'updated' }),
    );
  });

  it('writes invalid row errors', async () => {
    await processContactImport({
      db: {} as never,
      bucket: bucket('Name,Phone,Email,Consent\nAda,123,,yes\n'),
      organizationId,
      contactImportId,
    });

    expect(upsertContactImportRow).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      contactImportId,
      rowNumber: 2,
      status: 'invalid',
      contactId: null,
      rawValues: expect.objectContaining({ Phone: '123' }),
      normalizedValues: {
        phone: null,
        email: null,
      },
      errors: ['invalid_phone'],
    });
  });

  it('omits sensitive and unmapped raw values from failed row results', async () => {
    await processContactImport({
      db: {} as never,
      bucket: bucket(
        'Name,Phone,Email,Consent,Journal notes,Extra\nAda,123,,yes,medical note,unmapped\n',
      ),
      organizationId,
      contactImportId,
    });

    expect(upsertContactImportRow).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      contactImportId,
      rowNumber: 2,
      status: 'invalid',
      contactId: null,
      rawValues: {
        Name: 'Ada',
        Phone: '123',
        Email: '',
        Consent: 'yes',
      },
      normalizedValues: {
        phone: null,
        email: null,
      },
      errors: ['invalid_phone'],
    });
  });

  it('skips suppressed rows', async () => {
    vi.mocked(findSuppressionByHash).mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      organizationId,
      type: 'phone',
      value: '+46701234567',
      normalizedValue: '+46701234567',
      valueHash: 'hash',
      reason: 'opt_out',
      source: null,
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
    });

    await processContactImport({
      db: {} as never,
      bucket: bucket('Name,Phone,Email,Consent\nAda,0701234567,,yes\n'),
      organizationId,
      contactImportId,
    });

    expect(upsertImportedContact).not.toHaveBeenCalled();
    expect(upsertContactImportRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'suppressed' }),
    );
  });

  it('handles duplicate rows deterministically', async () => {
    await processContactImport({
      db: {} as never,
      bucket: bucket(
        'Name,Phone,Email,Consent\nAda,0701234567,,yes\nAda Duplicate,0701234567,,yes\n',
      ),
      organizationId,
      contactImportId,
    });

    expect(upsertImportedContact).toHaveBeenCalledTimes(1);
    expect(upsertContactImportRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rowNumber: 3,
        status: 'duplicate',
        errors: ['duplicate_contact_method'],
      }),
    );
  });

  it('skips rows with conflicting existing contact methods', async () => {
    vi.mocked(upsertImportedContact).mockResolvedValue({
      action: 'conflict',
      contact: null,
    });

    await processContactImport({
      db: {} as never,
      bucket: bucket('Name,Phone,Email,Consent\nAda,0701234567,ada@example.com,yes\n'),
      organizationId,
      contactImportId,
    });

    expect(upsertContactImportRow).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      contactImportId,
      rowNumber: 2,
      status: 'skipped',
      contactId: null,
      rawValues: expect.objectContaining({
        Phone: '0701234567',
        Email: 'ada@example.com',
      }),
      normalizedValues: {
        phone: '+46701234567',
        email: 'ada@example.com',
      },
      errors: ['conflicting_contact_methods'],
    });
  });

  it('rejects rolled-over last booking dates', async () => {
    await processContactImport({
      db: {} as never,
      bucket: bucket(
        'Name,Phone,Email,Last booking,Consent\nAda,0701234567,,2026-02-31,yes\n',
      ),
      organizationId,
      contactImportId,
    });

    expect(upsertImportedContact).not.toHaveBeenCalled();
    expect(upsertContactImportRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'invalid',
        errors: ['invalid_last_booking_at'],
      }),
    );
  });

  it('marks the import failed when processing throws', async () => {
    vi.mocked(getContactImportForProcessing).mockResolvedValue(null);

    await expect(
      processContactImport({
        db: {} as never,
        bucket: bucket('Name\nAda\n'),
        organizationId,
        contactImportId,
      }),
    ).rejects.toThrow('Contact import was not found.');

    expect(failContactImport).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      contactImportId,
      error: 'Contact import was not found.',
    });
  });
});
