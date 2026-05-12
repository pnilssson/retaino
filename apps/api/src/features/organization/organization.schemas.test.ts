import { describe, expect, it } from 'vitest';
import {
  createCurrentOrganizationLegalAcceptanceSchema,
  updateOrganizationProfileSchema,
} from '@retaino/shared/contracts';

describe('updateOrganizationProfileSchema', () => {
  it('accepts the required company and responsible contact fields', () => {
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
