import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  assertOrganizationId,
  contactIssueFilter,
  contactDetailToContract,
  contactSuppressionMethodFilter,
  contactStatusFilter,
  contactToContract,
  importRowToContract,
  resolveImportedContactMatch,
} from './contacts';

describe('contact query helpers', () => {
  it('rejects tenant scoped calls without an organization id', () => {
    expect(() => assertOrganizationId('')).toThrow('organizationId is required');
  });

  it('computes contact status from facts and suppressions', () => {
    expect(
      contactToContract(
        {
          id: '11111111-1111-4111-8111-111111111111',
          organizationId: '22222222-2222-4222-8222-222222222222',
          name: 'Ada Lovelace',
          phone: '0701234567',
          email: 'ada@example.com',
          normalizedPhone: '+46701234567',
          normalizedEmail: 'ada@example.com',
          phoneHash: 'p',
          emailHash: 'e',
          lastBookingAt: null,
          lastContactedAt: null,
          lastService: null,
          consentStatus: 'granted',
          source: 'csv',
          createdFromImportId: null,
          lastImportId: null,
          createdAt: new Date('2026-05-08T00:00:00.000Z'),
          updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        },
        { suppressed: false },
      ),
    ).toMatchObject({
      contactStatus: 'ready',
      contactIssues: [],
    });
  });

  it('maps contact details with suppressions', () => {
    expect(
      contactDetailToContract(
        {
          id: '11111111-1111-4111-8111-111111111111',
          organizationId: '22222222-2222-4222-8222-222222222222',
          name: 'Ada Lovelace',
          phone: '0701234567',
          email: 'ada@example.com',
          normalizedPhone: '+46701234567',
          normalizedEmail: 'ada@example.com',
          phoneHash: 'p',
          emailHash: 'e',
          lastBookingAt: null,
          lastContactedAt: null,
          lastService: null,
          consentStatus: 'granted',
          source: 'csv',
          createdFromImportId: null,
          lastImportId: null,
          createdAt: new Date('2026-05-08T00:00:00.000Z'),
          updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        },
        [
          {
            id: '33333333-3333-4333-8333-333333333333',
            organizationId: '22222222-2222-4222-8222-222222222222',
            type: 'phone',
            value: '0701234567',
            normalizedValue: '+46701234567',
            valueHash: 'p',
            reason: 'manual_contact_suppression',
            source: 'app',
            createdAt: new Date('2026-05-08T00:00:00.000Z'),
          },
        ],
      ),
    ).toMatchObject({
      contactStatus: 'blocked',
      contactIssues: ['suppressed_phone'],
      suppressions: [{ type: 'phone', reason: 'manual_contact_suppression' }],
    });
  });

  it('maps row results without losing row errors', () => {
    expect(
      importRowToContract({
        id: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        contactImportId: '33333333-3333-4333-8333-333333333333',
        rowNumber: 2,
        status: 'invalid',
        contactId: null,
        rawValues: { Phone: '123' },
        normalizedValues: {},
        errors: ['invalid_phone'],
        createdAt: new Date('2026-05-08T00:00:00.000Z'),
      }),
    ).toMatchObject({
      rowNumber: 2,
      status: 'invalid',
      errors: ['invalid_phone'],
    });
  });

  it('detects conflicting phone and email contact matches', () => {
    expect(
      resolveImportedContactMatch({
        phoneMatch: { id: '11111111-1111-4111-8111-111111111111' },
        emailMatch: { id: '22222222-2222-4222-8222-222222222222' },
      }),
    ).toEqual({ action: 'conflict' });
  });

  it('allows phone and email matches for the same contact', () => {
    const contact = { id: '11111111-1111-4111-8111-111111111111' };

    expect(
      resolveImportedContactMatch({
        phoneMatch: contact,
        emailMatch: contact,
      }),
    ).toEqual({ action: 'matched', contact });
  });

  it.each([
    ['status ready', contactStatusFilter, 'ready', 'not exists ('],
    ['status blocked', contactStatusFilter, 'blocked', 'exists ('],
    [
      'issue suppressed phone',
      contactIssueFilter,
      'suppressed_phone',
      'exists (',
    ],
  ] as const)(
    'builds valid suppression SQL for %s',
    (_name, filter, value, expected) => {
      const condition = filter(
        '22222222-2222-4222-8222-222222222222',
        value,
      );
      const query = new PgDialect().sqlToQuery(sql`select 1 where ${condition}`);

      expect(query.sql).toContain(expected);
      expect(query.sql).not.toContain('exists select');
      expect(query.sql).not.toContain('not exists select');
    },
  );

  it('does not build a suppression ownership filter without contact methods', () => {
    expect(
      contactSuppressionMethodFilter({ phoneHash: null, emailHash: null }),
    ).toBeUndefined();
  });

  it('builds suppression ownership filters from available contact methods', () => {
    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${contactSuppressionMethodFilter({
        phoneHash: 'phone-hash',
        emailHash: null,
      })}`,
    );

    expect(query.sql).toContain('"suppressions"."type" = $1');
    expect(query.sql).toContain('"suppressions"."value_hash" = $2');
    expect(query.params).toEqual(['phone', 'phone-hash']);
  });
});
