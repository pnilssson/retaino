import { describe, expect, it } from 'vitest';
import {
  CONTACT_IMPORT_TARGET_FIELDS,
  autoMapContactImportHeaders,
  bulkContactIdsSchema,
  bulkSuppressContactsSchema,
  contactMethodDedupeKeys,
  contactDetailSchema,
  contactImportMappingReady,
  contactImportMappedFieldEntries,
  contactListQuerySchema,
  contactImportStartSchema,
  contactSchema,
  countryCodeSchema,
  createContactSuppressionSchema,
  deriveSmsContactStatus,
  formatPhoneCountryLabel,
  getPhoneCountryCallingCode,
  hashContactValue,
  isSupportedCountryCode,
  normalizeEmail,
  normalizePhoneNumber,
  prepareContactMethodIdentity,
  prepareContactMethods,
  updateContactSchema,
  updateOrganizationProfileSchema,
} from '../../src/contracts';

describe('organization profile countryCode', () => {
  it('requires an ISO alpha-2 country code', () => {
    expect(
      updateOrganizationProfileSchema.safeParse({
        legalName: 'Retaino AB',
        registrationNumber: '559000-0000',
        billingEmail: 'billing@retaino.test',
        responsibleName: 'Ada Lovelace',
        responsibleEmail: 'ada@retaino.test',
        responsiblePhone: '+46700000000',
        countryCode: 'SE',
      }).success,
    ).toBe(true);

    expect(
      updateOrganizationProfileSchema.safeParse({
        legalName: 'Retaino AB',
        registrationNumber: '559000-0000',
        billingEmail: 'billing@retaino.test',
        responsibleName: 'Ada Lovelace',
        responsibleEmail: 'ada@retaino.test',
        countryCode: 'sweden',
      }).success,
    ).toBe(false);
  });

  it('normalizes and labels supported phone countries', () => {
    expect(countryCodeSchema.parse('se')).toBe('SE');
    expect(isSupportedCountryCode('SE')).toBe(true);
    expect(isSupportedCountryCode('ZZ')).toBe(false);
    expect(getPhoneCountryCallingCode('SE')).toBe('46');
    expect(formatPhoneCountryLabel('SE')).toBe('Sweden +46');
  });
});

describe('phone and email helpers', () => {
  it('normalizes local phone numbers with the default country hint', () => {
    expect(normalizePhoneNumber('070 123 45 67', 'SE')).toEqual({
      ok: true,
      normalizedPhone: '+46701234567',
    });
  });

  it('preserves international phone prefixes over the default country hint', () => {
    expect(normalizePhoneNumber('+45 12 34 56 78', 'SE')).toEqual({
      ok: true,
      normalizedPhone: '+4512345678',
    });
  });

  it('returns a stable validation error for invalid phone numbers', () => {
    expect(normalizePhoneNumber('123', 'SE')).toEqual({
      ok: false,
      error: 'invalid_phone',
    });
  });

  it('normalizes email addresses for matching', () => {
    expect(normalizeEmail(' Ada@Example.COM ')).toBe('ada@example.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
  });

  it('hashes normalized contact values deterministically', async () => {
    await expect(hashContactValue('+46701234567')).resolves.toBe(
      await hashContactValue('+46701234567'),
    );
    await expect(hashContactValue('+46701234567')).resolves.toHaveLength(64);
  });

  it('prepares contact method facts for storage and matching', async () => {
    const methods = await prepareContactMethodIdentity({
      phone: '070 123 45 67',
      email: ' Ada@Example.COM ',
      phoneCountryCode: 'SE',
      requireContactMethod: true,
    });

    expect(methods).toMatchObject({
      normalizedPhone: '+46701234567',
      normalizedEmail: 'ada@example.com',
      errors: [],
    });
    expect(methods.phoneHash).toHaveLength(64);
    expect(methods.emailHash).toHaveLength(64);
    expect(methods.dedupeKeys).toEqual([
      `phone:${methods.phoneHash}`,
      `email:${methods.emailHash}`,
    ]);
    expect(contactMethodDedupeKeys(methods)).toEqual(methods.dedupeKeys);
  });

  it('keeps prepareContactMethods compatible without exposing dedupe keys', async () => {
    const methods = await prepareContactMethods({
      phone: '070 123 45 67',
      email: 'ada@example.com',
      phoneCountryCode: 'SE',
    });

    expect(methods).toMatchObject({
      normalizedPhone: '+46701234567',
      normalizedEmail: 'ada@example.com',
      errors: [],
    });
    expect('dedupeKeys' in methods).toBe(false);
  });

  it('reports missing or invalid contact methods with stable errors', async () => {
    await expect(
      prepareContactMethods({
        phone: null,
        email: null,
        phoneCountryCode: 'SE',
        requireContactMethod: true,
      }),
    ).resolves.toMatchObject({
      errors: ['missing_contact_method'],
    });

    await expect(
      prepareContactMethods({
        phone: '123',
        email: 'not-an-email',
        phoneCountryCode: 'SE',
        requireContactMethod: true,
      }),
    ).resolves.toMatchObject({
      normalizedPhone: null,
      normalizedEmail: null,
      errors: ['invalid_phone', 'invalid_email'],
    });
  });
});

describe('contact contracts', () => {
  it('validates contact response shape', () => {
    expect(
      contactSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
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
      }).success,
    ).toBe(true);
  });

  it('validates contact detail with suppressions', () => {
    expect(
      contactDetailSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        name: 'Ada Lovelace',
        phone: '0701234567',
        email: 'ada@example.com',
        normalizedPhone: '+46701234567',
        normalizedEmail: 'ada@example.com',
        lastBookingAt: null,
        lastContactedAt: null,
        consentStatus: 'granted',
        contactStatus: 'blocked',
        contactIssues: ['suppressed_phone'],
        suppressions: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            type: 'phone',
            value: '+46701234567',
            reason: 'manual_contact_suppression',
            source: 'app',
            createdAt: '2026-05-08T00:00:00.000Z',
          },
        ],
        createdAt: '2026-05-08T00:00:00.000Z',
        updatedAt: '2026-05-08T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('validates contact update and suppression payloads', () => {
    expect(
      updateContactSchema.parse({
        name: 'Ada Lovelace',
        phone: '0701234567',
        email: 'ada@example.com',
        lastBookingAt: '2026-05-08T00:00:00.000Z',
      }),
    ).toMatchObject({
      name: 'Ada Lovelace',
    });
    expect(
      updateContactSchema.safeParse({ consentStatus: 'granted' }).success,
    ).toBe(false);

    expect(
      createContactSuppressionSchema.parse({ type: 'phone' }),
    ).toMatchObject({ type: 'phone' });
    expect(createContactSuppressionSchema.safeParse({ type: 'sms' }).success).toBe(
      false,
    );
  });

  it('derives SMS contact status and issue codes', () => {
    expect(
      deriveSmsContactStatus({
        normalizedPhone: '+46701234567',
        consentStatus: 'granted',
        suppressed: false,
      }),
    ).toEqual({ contactStatus: 'ready', contactIssues: [] });

    expect(
      deriveSmsContactStatus({
        normalizedPhone: null,
        consentStatus: 'unknown',
        suppressed: true,
      }),
    ).toEqual({
      contactStatus: 'incomplete',
      contactIssues: ['missing_phone', 'suppressed_phone', 'missing_consent'],
    });
  });

  it('validates CSV mapping payloads', () => {
    expect(CONTACT_IMPORT_TARGET_FIELDS).toEqual([
      'name',
      'phone',
      'email',
      'lastBookingAt',
    ]);
    expect(
      contactImportStartSchema.safeParse({
        mapping: {
          name: 'Name',
          phone: 'Phone',
          email: 'Email',
        },
        phoneCountryCode: 'SE',
        permissionAttestation: true,
      }).success,
    ).toBe(true);

    expect(
      contactImportStartSchema.safeParse({
        mapping: {
          name: 'Name',
          phone: 'Phone',
          unknown: 'Column',
        },
        phoneCountryCode: 'SE',
      }).success,
    ).toBe(false);
    expect(
      contactImportStartSchema.safeParse({
        mapping: {
          phone: 'Phone',
          consentStatus: 'Marketing consent',
        },
        phoneCountryCode: 'SE',
        permissionAttestation: true,
      }).success,
    ).toBe(false);
    expect(
      contactImportStartSchema.safeParse({
        mapping: {
          phone: 'Phone',
          lastService: 'Service',
        },
        phoneCountryCode: 'SE',
        permissionAttestation: true,
      }).success,
    ).toBe(false);
  });

  it('validates bulk contact id payloads', () => {
    const ids = Array.from(
      { length: 100 },
      (_, index) => `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
    );

    expect(bulkContactIdsSchema.safeParse({ contactIds: [ids[0]] }).success).toBe(
      true,
    );
    expect(bulkContactIdsSchema.safeParse({ contactIds: ids }).success).toBe(
      true,
    );
    expect(bulkContactIdsSchema.safeParse({ contactIds: [] }).success).toBe(
      false,
    );
    expect(
      bulkContactIdsSchema.safeParse({ contactIds: ['not-a-uuid'] }).success,
    ).toBe(false);
    expect(
      bulkContactIdsSchema.safeParse({ contactIds: [...ids, ids[0]] }).success,
    ).toBe(false);
  });

  it('only allows phone bulk suppressions', () => {
    expect(
      bulkSuppressContactsSchema.safeParse({
        contactIds: ['11111111-1111-4111-8111-111111111111'],
        type: 'phone',
      }).success,
    ).toBe(true);
    expect(
      bulkSuppressContactsSchema.safeParse({
        contactIds: ['11111111-1111-4111-8111-111111111111'],
        type: 'email',
      }).success,
    ).toBe(false);
  });

  it('automaps contact import headers and reports mapping readiness', () => {
    const mapping = autoMapContactImportHeaders([
      'Customer name',
      'Telefon',
      'E-mail',
      'Last booking date',
      'Service',
      'Marketing consent',
      'SMS opt-in',
      'Source system',
    ]);

    expect(mapping).toEqual({
      name: 'Customer name',
      phone: 'Telefon',
      email: 'E-mail',
      lastBookingAt: 'Last booking date',
    });
    expect(contactImportMappingReady(mapping)).toBe(true);
    expect(contactImportMappingReady({ name: 'Customer name' })).toBe(false);
    expect(contactImportMappedFieldEntries(mapping)).toEqual([
      { target: 'name', header: 'Customer name' },
      { target: 'phone', header: 'Telefon' },
      { target: 'email', header: 'E-mail' },
      { target: 'lastBookingAt', header: 'Last booking date' },
    ]);
  });

  it('requires import permission attestation before processing contacts', () => {
    expect(
      contactImportStartSchema.safeParse({
        mapping: { phone: 'Phone' },
        phoneCountryCode: 'SE',
      }).success,
    ).toBe(false);

    expect(
      contactImportStartSchema.safeParse({
        mapping: { phone: 'Phone' },
        phoneCountryCode: 'SE',
        permissionAttestation: true,
      }).success,
    ).toBe(true);
  });

  it('validates server-backed contact filters', () => {
    expect(
      contactListQuerySchema.parse({
        issue: 'suppressed_phone',
        sort: 'name',
        direction: 'asc',
      }),
    ).toMatchObject({
      issue: 'suppressed_phone',
      sort: 'name',
      direction: 'asc',
    });
  });

  it('allows contact updates to include the selected phone country', () => {
    expect(
      updateContactSchema.parse({
        phone: '070 123 45 67',
        phoneCountryCode: 'SE',
      }),
    ).toMatchObject({
      phone: '070 123 45 67',
      phoneCountryCode: 'SE',
    });
  });
});
