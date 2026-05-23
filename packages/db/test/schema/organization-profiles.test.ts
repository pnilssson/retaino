import { describe, expect, it } from 'vitest';
import { organizationProfiles } from '../../src/schema/organization-profiles';

describe('organization profiles schema', () => {
  it('stores the organization currency', () => {
    expect(organizationProfiles.currency.name).toBe('currency');
  });
});
