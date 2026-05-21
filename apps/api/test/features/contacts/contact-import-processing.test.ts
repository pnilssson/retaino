import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findSuppressionByHash } from '@retaino/db';
import {
  classifyContactImportRow,
  createContactImportAccumulator,
  recordContactImportOutcome,
} from '../../../src/features/contacts/contact-import-processing';

vi.mock('@retaino/db', () => ({
  findSuppressionByHash: vi.fn(),
}));

const organizationId = '22222222-2222-4222-8222-222222222222';
const mapping = {
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
  lastBookingAt: 'Last booking',
};

describe('contact import row processing', () => {
  beforeEach(() => {
    vi.mocked(findSuppressionByHash).mockReset();
    vi.mocked(findSuppressionByHash).mockResolvedValue(null);
  });

  it('classifies valid rows and records persistence outcomes separately', async () => {
    const accumulator = createContactImportAccumulator();
    const outcome = await classifyContactImportRow({
      db: {} as never,
      organizationId,
      rowNumber: 2,
      rawValues: {
        Name: 'Ada Lovelace',
        Phone: '070 123 45 67',
        Email: ' Ada@Example.COM ',
        'Last booking': '2026-01-02',
      },
      mapping,
      phoneCountryCode: 'SE',
      accumulator,
    });

    expect(outcome).toMatchObject({
      action: 'ready',
      row: {
        rowNumber: 2,
        name: 'Ada Lovelace',
        phone: '070 123 45 67',
        email: 'Ada@Example.COM',
        normalizedPhone: '+46701234567',
        normalizedEmail: 'ada@example.com',
        lastBookingAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    });
    expect(accumulator.counts.totalRows).toBe(0);

    recordContactImportOutcome(accumulator, 'created');

    expect(accumulator.counts).toMatchObject({
      totalRows: 1,
      processedRows: 1,
      createdCount: 1,
      errorSummary: [],
    });
  });

  it('counts invalid rows through the accumulator', async () => {
    const accumulator = createContactImportAccumulator();
    const outcome = await classifyContactImportRow({
      db: {} as never,
      organizationId,
      rowNumber: 2,
      rawValues: {
        Name: 'Ada Lovelace',
        Phone: '123',
        Email: 'not-an-email',
        'Last booking': '2026-99-99',
      },
      mapping,
      phoneCountryCode: 'SE',
      accumulator,
    });

    expect(outcome).toEqual({
      action: 'invalid',
      errors: ['invalid_phone', 'invalid_email', 'invalid_last_booking_at'],
    });
    expect(accumulator.counts).toMatchObject({
      totalRows: 1,
      processedRows: 1,
      invalidCount: 1,
      errorSummary: [
        'invalid_phone',
        'invalid_email',
        'invalid_last_booking_at',
      ],
    });
  });

  it('counts duplicate contact methods before suppression lookup', async () => {
    const accumulator = createContactImportAccumulator();
    await classifyContactImportRow({
      db: {} as never,
      organizationId,
      rowNumber: 2,
      rawValues: { Name: 'Ada', Phone: '0701234567', Email: '' },
      mapping,
      phoneCountryCode: 'SE',
      accumulator,
    });

    const outcome = await classifyContactImportRow({
      db: {} as never,
      organizationId,
      rowNumber: 3,
      rawValues: { Name: 'Ada again', Phone: '0701234567', Email: '' },
      mapping,
      phoneCountryCode: 'SE',
      accumulator,
    });

    expect(outcome).toEqual({
      action: 'duplicate',
      errors: ['duplicate_contact_method'],
    });
    expect(findSuppressionByHash).toHaveBeenCalledTimes(1);
    expect(accumulator.counts).toMatchObject({
      duplicateCount: 1,
      errorSummary: ['duplicate_contact_method'],
    });
  });

  it('marks suppressed rows as ready after contact method identity is known', async () => {
    vi.mocked(findSuppressionByHash).mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      organizationId,
      type: 'phone',
      value: '0701234567',
      normalizedValue: '+46701234567',
      valueHash: 'hash',
      reason: 'opt_out',
      source: null,
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
    });
    const accumulator = createContactImportAccumulator();

    const outcome = await classifyContactImportRow({
      db: {} as never,
      organizationId,
      rowNumber: 2,
      rawValues: { Name: 'Ada', Phone: '0701234567', Email: '' },
      mapping,
      phoneCountryCode: 'SE',
      accumulator,
    });

    expect(outcome).toEqual({
      action: 'ready',
      row: expect.objectContaining({
        phoneHash: expect.any(String),
        suppressed: true,
      }),
    });
    expect(accumulator.counts).toMatchObject({
      totalRows: 0,
      processedRows: 0,
      suppressedCount: 0,
      errorSummary: [],
    });
  });

  it('counts imported suppressed rows without adding import errors', () => {
    const accumulator = createContactImportAccumulator();

    recordContactImportOutcome(accumulator, 'created', [], {
      suppressed: true,
    });

    expect(accumulator.counts).toMatchObject({
      totalRows: 1,
      processedRows: 1,
      createdCount: 1,
      suppressedCount: 1,
      errorSummary: [],
    });
  });
});
