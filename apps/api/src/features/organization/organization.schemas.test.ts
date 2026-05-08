import { describe, expect, it } from 'vitest';
import {
  createOrganizationAcceptanceSchema,
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
      }).success,
    ).toBe(false);
  });
});

describe('createOrganizationAcceptanceSchema', () => {
  it('requires a supported document type and version', () => {
    expect(
      createOrganizationAcceptanceSchema.safeParse({
        documentType: 'sending_policy',
        documentVersion: '2026-05-07',
      }).success,
    ).toBe(true);
  });

  it('rejects unsupported document types', () => {
    expect(
      createOrganizationAcceptanceSchema.safeParse({
        documentType: 'custom_contract',
        documentVersion: '2026-05-05',
      }).success,
    ).toBe(false);
  });

  it('rejects public documents that are not organization signed', () => {
    expect(
      createOrganizationAcceptanceSchema.safeParse({
        documentType: 'privacy',
        documentVersion: '2026-05-07',
      }).success,
    ).toBe(false);
  });
});
