import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { organizationSmsSenders } from '../../src/schema/sms-senders';

describe('organization SMS senders schema', () => {
  it('keeps sender configuration organization scoped', () => {
    expect(organizationSmsSenders.organizationId.name).toBe('organization_id');
  });

  it('stores provider resource references without credentials', () => {
    expect(organizationSmsSenders.provider.name).toBe('provider');
    expect(organizationSmsSenders.status.name).toBe('status');
    expect(organizationSmsSenders.phoneNumber.name).toBe('phone_number');
    expect(organizationSmsSenders.providerMessagingServiceId.name).toBe(
      'provider_messaging_service_id',
    );
    expect(organizationSmsSenders.providerPhoneNumberId.name).toBe(
      'provider_phone_number_id',
    );
    expect(organizationSmsSenders.releaseScheduledAt.name).toBe(
      'release_scheduled_at',
    );
    expect(organizationSmsSenders.releasedAt.name).toBe('released_at');
    expect('authToken' in organizationSmsSenders).toBe(false);
    expect('apiKeySecret' in organizationSmsSenders).toBe(false);
  });

  it('indexes provider references used by inbound webhooks', () => {
    const indexes = getTableConfig(organizationSmsSenders).indexes.map(
      (index) => index.config,
    );

    expect(indexColumns(indexes, 'organization_sms_senders_provider_service_idx'))
      .toEqual(['provider', 'provider_messaging_service_id']);
    expect(indexColumns(indexes, 'organization_sms_senders_provider_phone_ref_idx'))
      .toEqual(['provider', 'provider_phone_number_id']);
    expect(indexColumns(indexes, 'organization_sms_senders_provider_phone_idx'))
      .toEqual(['provider', 'phone_number']);
  });
});

function indexColumns(
  indexes: Array<{ name: string; columns: Array<{ name: string }> }>,
  name: string,
) {
  return indexes
    .find((index) => index.name === name)
    ?.columns.map((column) => column.name);
}
