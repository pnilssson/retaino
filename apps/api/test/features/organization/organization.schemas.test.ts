import { describe, expect, it } from 'vitest';
import {
  createCurrentOrganizationLegalAcceptanceSchema,
  updateOrganizationProfileSchema,
} from '@retaino/shared/contracts';

describe('updateOrganizationProfileSchema', () => {
  it('accepts the required company and responsible contact fields', () => {
    const result = updateOrganizationProfileSchema.safeParse({
      legalName: 'Retaino AB',
      registrationNumber: '559000-0000',
      billingEmail: 'billing@retaino.test',
      responsibleName: 'Ada Lovelace',
      responsibleEmail: 'ada@retaino.test',
      responsiblePhone: '+46700000000',
      countryCode: 'SE',
      currency: 'sek',
    });

    expect(result.success).toBe(true);
    expect(result.data?.currency).toBe('SEK');
  });

  it('rejects invalid responsible contact email', () => {
    expect(
      updateOrganizationProfileSchema.safeParse({
        legalName: 'Retaino AB',
        registrationNumber: '559000-0000',
        billingEmail: 'billing@retaino.test',
        responsibleName: 'Ada Lovelace',
        responsibleEmail: 'not-an-email',
        countryCode: 'SE',
        currency: 'SEK',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid currencies', () => {
    expect(
      updateOrganizationProfileSchema.safeParse({
        legalName: 'Retaino AB',
        registrationNumber: '559000-0000',
        billingEmail: 'billing@retaino.test',
        responsibleName: 'Ada Lovelace',
        responsibleEmail: 'ada@retaino.test',
        countryCode: 'SE',
        currency: 'NOT_A_CURRENCY',
      }).success,
    ).toBe(false);
  });
});

describe('createCurrentOrganizationLegalAcceptanceSchema', () => {
  it('accepts an empty legal bundle acceptance body', () => {
    expect(
      createCurrentOrganizationLegalAcceptanceSchema.safeParse({}).success,
    ).toBe(true);
  });

  it('rejects client supplied document versions', () => {
    expect(
      createCurrentOrganizationLegalAcceptanceSchema.safeParse({
        documents: [
          {
            documentType: 'terms',
            documentVersion: '2026-05-09',
          },
        ],
      }).success,
    ).toBe(false);
  });
});
