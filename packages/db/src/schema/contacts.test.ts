import { describe, expect, it } from 'vitest';
import {
  contactImportRows,
  contactImports,
  contacts,
  suppressions,
} from './contacts';

describe('contacts schema', () => {
  it('keeps every contacts table organization scoped', () => {
    expect(contacts.organizationId.name).toBe('organization_id');
    expect(contactImports.organizationId.name).toBe('organization_id');
    expect(contactImportRows.organizationId.name).toBe('organization_id');
    expect(suppressions.organizationId.name).toBe('organization_id');
  });

  it('stores import country hints and row-level results', () => {
    expect(contactImports.phoneCountryCode.name).toBe('phone_country_code');
    expect(contactImportRows.rowNumber.name).toBe('row_number');
    expect(contactImportRows.errors.name).toBe('errors');
  });

  it('stores dedupe and suppression hashes', () => {
    expect(contacts.phoneHash.name).toBe('phone_hash');
    expect(contacts.emailHash.name).toBe('email_hash');
    expect(suppressions.valueHash.name).toBe('value_hash');
  });
});
