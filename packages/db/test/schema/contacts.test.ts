import { describe, expect, it } from 'vitest';
import {
  contactImports,
  contacts,
  suppressions,
} from '../../src/schema/contacts';

describe('contacts schema', () => {
  it('keeps every contacts table organization scoped', () => {
    expect(contacts.organizationId.name).toBe('organization_id');
    expect(contactImports.organizationId.name).toBe('organization_id');
    expect(suppressions.organizationId.name).toBe('organization_id');
  });

  it('stores import job state without row-level result storage', () => {
    expect(contactImports.phoneCountryCode.name).toBe('phone_country_code');
    expect(contactImports.fileKey.name).toBe('file_key');
    expect(contactImports.mapping.name).toBe('mapping');
    expect('preview' in contactImports).toBe(false);
    expect('filename' in contactImports).toBe(false);
  });

  it('stores dedupe and suppression hashes', () => {
    expect(contacts.phoneHash.name).toBe('phone_hash');
    expect(contacts.emailHash.name).toBe('email_hash');
    expect('lastService' in contacts).toBe(false);
    expect('source' in contacts).toBe(false);
    expect(suppressions.valueHash.name).toBe('value_hash');
  });
});
