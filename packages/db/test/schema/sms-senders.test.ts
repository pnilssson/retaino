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
    expect('authToken' in organizationSmsSenders).toBe(false);
    expect('apiKeySecret' in organizationSmsSenders).toBe(false);
  });
});
