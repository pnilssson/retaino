import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCurrentLegalBundle,
  getCurrentOrganizationLegalAcceptance,
  getOrganizationBillingProfile,
  getOrganizationProfileByOrganizationId,
  getOrganizationSmsSender,
  upsertOrganizationSmsSender,
} from '@retaino/db';
import type { LegalBundle, OrganizationLegalAcceptance } from '@retaino/shared/contracts';
import { smsRoutes } from '../../../src/features/sms/sms.routes';
import { captureHandledError } from '../../../src/lib/sentry';
import type { AppEnv } from '../../../src/types';

vi.mock('@retaino/db', () => ({
  getCurrentLegalBundle: vi.fn(),
  getCurrentOrganizationLegalAcceptance: vi.fn(),
  getOrganizationBillingProfile: vi.fn(),
  getOrganizationProfileByOrganizationId: vi.fn(),
  getOrganizationSmsSender: vi.fn(),
  upsertOrganizationSmsSender: vi.fn(),
}));

vi.mock('../../../src/lib/sentry', () => ({
  captureHandledError: vi.fn(),
}));

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  clerkUserId: 'user_123',
  email: 'ada@retaino.test',
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
};

const organization = {
  id: '22222222-2222-4222-8222-222222222222',
  clerkOrganizationId: 'org_123',
  name: 'Retaino',
  slug: 'retaino',
  onboardingStatus: 'complete',
  role: 'org:member',
};

const profile = {
  id: '33333333-3333-4333-8333-333333333333',
  organizationId: organization.id,
  legalName: 'Retaino AB',
  registrationNumber: '559000-0000',
  billingEmail: 'billing@retaino.test',
  responsibleName: 'Ada Lovelace',
  responsibleEmail: 'ada@retaino.test',
  responsiblePhone: '+46700000000',
  countryCode: 'SE',
  currency: 'SEK',
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
};

const legalBundle: LegalBundle = {
  version: '2026-05-09',
  locale: 'sv',
  hash: 'f'.repeat(64),
  documents: [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      legalDocumentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      documentType: 'terms',
      locale: 'sv',
      slug: 'terms',
      title: 'Retaino Terms and Conditions',
      documentVersion: '2026-05-09',
      effectiveDate: '2026-05-09',
      contentHash: 'a'.repeat(64),
      publicVisible: true,
      acceptanceRequired: true,
      sortOrder: 10,
      publishedAt: '2026-05-09T00:00:00.000Z',
    },
  ],
};

const legalAcceptance: OrganizationLegalAcceptance = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: organization.id,
  userId: user.id,
  locale: 'sv',
  bundleVersion: legalBundle.version,
  bundleHash: legalBundle.hash,
  documentsSnapshot: legalBundle.documents,
  ipAddress: '203.0.113.1',
  userAgent: 'vitest',
  acceptedAt: '2026-05-05T00:00:00.000Z',
  acceptedByEmail: user.email,
};

function testApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    c.set('user', user);
    c.set('organization', organization);
    await next();
  });

  app.route('/v1/sms', smsRoutes);
  return app;
}

describe('smsRoutes', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getOrganizationProfileByOrganizationId).mockReset();
    vi.mocked(getOrganizationBillingProfile).mockReset();
    vi.mocked(getOrganizationSmsSender).mockReset();
    vi.mocked(getCurrentLegalBundle).mockReset();
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockReset();
    vi.mocked(upsertOrganizationSmsSender).mockReset();
    vi.mocked(getCurrentLegalBundle).mockResolvedValue(legalBundle);
    vi.mocked(getCurrentOrganizationLegalAcceptance).mockResolvedValue(
      legalAcceptance,
    );
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(profile);
    vi.mocked(captureHandledError).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns SMS sender setup without provider resource IDs', async () => {
    vi.mocked(getOrganizationSmsSender).mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      organizationId: organization.id,
      provider: 'fake',
      status: 'ready',
      phoneNumber: '+46700000000',
      countryCode: 'SE',
      numberType: 'mobile',
      providerMessagingServiceId: `fake-ms-${organization.id}`,
      providerPhoneNumberId: 'fake-pn-46700000000',
      regulatoryStatus: 'not_required',
      failureReason: null,
      provisionedAt: '2026-05-18T00:00:00.000Z',
      lastVerifiedAt: '2026-05-18T00:00:00.000Z',
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });

    const response = await testApp().request(
      '/v1/sms',
      {},
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { sender: Record<string, unknown> };
    expect(body.sender.phoneNumber).toBe('+46700000000');
    expect(body.sender).not.toHaveProperty('provider');
    expect(body.sender).not.toHaveProperty('providerMessagingServiceId');
    expect(body.sender).not.toHaveProperty('providerPhoneNumberId');
    expect(body.sender).not.toHaveProperty('numberType');
  });

  it('does not expose incomplete provider setup as ready', async () => {
    vi.mocked(getOrganizationSmsSender).mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      organizationId: organization.id,
      provider: 'fake',
      status: 'ready',
      phoneNumber: '+46700000000',
      countryCode: 'SE',
      numberType: 'mobile',
      providerMessagingServiceId: null,
      providerPhoneNumberId: 'fake-pn-46700000000',
      regulatoryStatus: 'not_required',
      failureReason: null,
      provisionedAt: '2026-05-18T00:00:00.000Z',
      lastVerifiedAt: '2026-05-18T00:00:00.000Z',
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });

    const response = await testApp().request(
      '/v1/sms',
      {},
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { sender: Record<string, unknown> };
    expect(body.sender.status).toBe('pending');
    expect(body.sender).not.toHaveProperty('providerMessagingServiceId');
  });

  it('lists SMS sender countries for eligible members', async () => {
    const response = await testApp().request(
      '/v1/sms/countries',
      {},
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      countries: unknown[];
    };

    expect(body.countries).toEqual(
      [
        expect.objectContaining({
          countryCode: 'SE',
          label: 'Sweden',
        }),
      ],
    );
    expect(body.countries[0]).not.toHaveProperty('supportedNumberTypes');
    expect(body.countries[0]).not.toHaveProperty('selfServeAvailable');
  });

  it('provisions an SMS sender from the selected country once billing is active', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(activeBilling());
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(null);
    vi.mocked(upsertOrganizationSmsSender).mockImplementation(
      async (_db, input) => ({
        id: '66666666-6666-4666-8666-666666666666',
        organizationId: input.organizationId,
        provider: input.provider,
        status: input.status,
        phoneNumber: input.phoneNumber,
        countryCode: input.countryCode,
        numberType: input.numberType,
        providerMessagingServiceId: input.providerMessagingServiceId,
        providerPhoneNumberId: input.providerPhoneNumberId,
        regulatoryStatus: input.regulatoryStatus,
        failureReason: input.failureReason,
        provisionedAt: input.provisionedAt?.toISOString() ?? null,
        lastVerifiedAt: input.lastVerifiedAt?.toISOString() ?? null,
        createdAt: '2026-05-18T00:00:00.000Z',
        updatedAt: '2026-05-18T00:00:00.000Z',
      }),
    );

    const response = await testApp().request(
      '/v1/sms',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          countryCode: 'SE',
        }),
      },
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { sender: Record<string, unknown> };
    expect(body.sender).not.toHaveProperty('provider');
    expect(body.sender).not.toHaveProperty('providerMessagingServiceId');
    expect(body.sender).not.toHaveProperty('providerPhoneNumberId');
    expect(body.sender).not.toHaveProperty('numberType');
    expect(upsertOrganizationSmsSender).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        organizationId: organization.id,
        provider: 'fake',
        status: 'pending',
        phoneNumber: null,
        countryCode: 'SE',
        numberType: 'mobile',
        providerMessagingServiceId: null,
        providerPhoneNumberId: null,
      }),
    );
    expect(upsertOrganizationSmsSender).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        organizationId: organization.id,
        provider: 'fake',
        status: 'ready',
        phoneNumber: '+46700000000',
        providerMessagingServiceId: `fake-ms-${organization.id}`,
      }),
    );
  });

  it('continues pending sender setup when the selected number is no longer listed', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(activeBilling());
    vi.mocked(getOrganizationSmsSender).mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      organizationId: organization.id,
      provider: 'fake',
      status: 'pending',
      phoneNumber: '+46799999999',
      countryCode: 'SE',
      numberType: 'mobile',
      providerMessagingServiceId: null,
      providerPhoneNumberId: null,
      regulatoryStatus: null,
      failureReason: null,
      provisionedAt: null,
      lastVerifiedAt: null,
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });
    vi.mocked(upsertOrganizationSmsSender).mockImplementation(
      async (_db, input) => ({
        id: '66666666-6666-4666-8666-666666666666',
        organizationId: input.organizationId,
        provider: input.provider,
        status: input.status,
        phoneNumber: input.phoneNumber,
        countryCode: input.countryCode,
        numberType: input.numberType,
        providerMessagingServiceId: input.providerMessagingServiceId,
        providerPhoneNumberId: input.providerPhoneNumberId,
        regulatoryStatus: input.regulatoryStatus,
        failureReason: input.failureReason,
        provisionedAt: input.provisionedAt?.toISOString() ?? null,
        lastVerifiedAt: input.lastVerifiedAt?.toISOString() ?? null,
        createdAt: '2026-05-18T00:00:00.000Z',
        updatedAt: '2026-05-18T00:00:00.000Z',
      }),
    );

    const response = await testApp().request(
      '/v1/sms',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          countryCode: 'SE',
        }),
      },
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(201);
    expect(upsertOrganizationSmsSender).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'ready',
        phoneNumber: '+46799999999',
      }),
    );
  });

  it('continues failed sender setup when the selected number is no longer listed', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(activeBilling());
    vi.mocked(getOrganizationSmsSender).mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      organizationId: organization.id,
      provider: 'fake',
      status: 'failed',
      phoneNumber: '+46799999999',
      countryCode: 'SE',
      numberType: 'mobile',
      providerMessagingServiceId: `fake-ms-${organization.id}`,
      providerPhoneNumberId: 'fake-pn-46799999999',
      regulatoryStatus: null,
      failureReason: 'Previous setup failed.',
      provisionedAt: null,
      lastVerifiedAt: null,
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });
    vi.mocked(upsertOrganizationSmsSender).mockImplementation(
      async (_db, input) => ({
        id: '66666666-6666-4666-8666-666666666666',
        organizationId: input.organizationId,
        provider: input.provider,
        status: input.status,
        phoneNumber: input.phoneNumber,
        countryCode: input.countryCode,
        numberType: input.numberType,
        providerMessagingServiceId: input.providerMessagingServiceId,
        providerPhoneNumberId: input.providerPhoneNumberId,
        regulatoryStatus: input.regulatoryStatus,
        failureReason: input.failureReason,
        provisionedAt: input.provisionedAt?.toISOString() ?? null,
        lastVerifiedAt: input.lastVerifiedAt?.toISOString() ?? null,
        createdAt: '2026-05-18T00:00:00.000Z',
        updatedAt: '2026-05-18T00:00:00.000Z',
      }),
    );

    const response = await testApp().request(
      '/v1/sms',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          countryCode: 'SE',
        }),
      },
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(201);
    expect(upsertOrganizationSmsSender).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        status: 'pending',
        phoneNumber: '+46799999999',
        providerMessagingServiceId: `fake-ms-${organization.id}`,
        providerPhoneNumberId: 'fake-pn-46799999999',
        failureReason: null,
      }),
    );
    expect(upsertOrganizationSmsSender).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        status: 'ready',
        phoneNumber: '+46799999999',
      }),
    );
  });

  it('drops stale phone provider IDs when a different sender is selected', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(activeBilling());
    vi.mocked(getOrganizationSmsSender).mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      organizationId: organization.id,
      provider: 'fake',
      status: 'failed',
      phoneNumber: '+15005550006',
      countryCode: 'US',
      numberType: 'local',
      providerMessagingServiceId: `fake-ms-${organization.id}`,
      providerPhoneNumberId: 'PN_old',
      regulatoryStatus: 'ready',
      failureReason: 'Previous sender failed.',
      provisionedAt: '2026-05-18T00:00:00.000Z',
      lastVerifiedAt: '2026-05-18T00:00:00.000Z',
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });
    vi.mocked(upsertOrganizationSmsSender).mockImplementation(
      async (_db, input) => ({
        id: '66666666-6666-4666-8666-666666666666',
        organizationId: input.organizationId,
        provider: input.provider,
        status: input.status,
        phoneNumber: input.phoneNumber,
        countryCode: input.countryCode,
        numberType: input.numberType,
        providerMessagingServiceId: input.providerMessagingServiceId,
        providerPhoneNumberId: input.providerPhoneNumberId,
        regulatoryStatus: input.regulatoryStatus,
        failureReason: input.failureReason,
        provisionedAt: input.provisionedAt?.toISOString() ?? null,
        lastVerifiedAt: input.lastVerifiedAt?.toISOString() ?? null,
        createdAt: '2026-05-18T00:00:00.000Z',
        updatedAt: '2026-05-18T00:00:00.000Z',
      }),
    );

    const response = await testApp().request(
      '/v1/sms',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          countryCode: 'SE',
        }),
      },
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(201);
    expect(upsertOrganizationSmsSender).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        status: 'pending',
        phoneNumber: null,
        countryCode: 'SE',
        numberType: 'mobile',
        providerMessagingServiceId: `fake-ms-${organization.id}`,
        providerPhoneNumberId: null,
        regulatoryStatus: null,
        provisionedAt: null,
        lastVerifiedAt: null,
      }),
    );
  });

  it('blocks SMS sender provisioning without active billing', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(null);

    const response = await testApp().request(
      '/v1/sms',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      },
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(403);
    expect(upsertOrganizationSmsSender).not.toHaveBeenCalled();
  });

  it('rejects unsupported SMS sender countries before provisioning', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(activeBilling());
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(null);

    const response = await testApp().request(
      '/v1/sms',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          countryCode: 'FR',
        }),
      },
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(400);
    expect(upsertOrganizationSmsSender).not.toHaveBeenCalled();
  });

  it('rejects SMS sender countries without two-way mobile senders', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(activeBilling());
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(null);

    const response = await testApp().request(
      '/v1/sms',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          countryCode: 'US',
        }),
      },
      { SMS_SENDING_MODE: 'test' },
    );

    expect(response.status).toBe(400);
    expect(upsertOrganizationSmsSender).not.toHaveBeenCalled();
  });

  it('returns retryable responses for provider outages', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('rate limited', {
        status: 429,
      }),
    );

    vi.stubGlobal('fetch', fetchImpl);
    vi.mocked(getOrganizationProfileByOrganizationId).mockResolvedValue(profile);
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue(activeBilling());
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(null);
    vi.mocked(upsertOrganizationSmsSender).mockImplementation(
      async (_db, input) => ({
        id: '66666666-6666-4666-8666-666666666666',
        organizationId: input.organizationId,
        provider: input.provider,
        status: input.status,
        phoneNumber: input.phoneNumber,
        countryCode: input.countryCode,
        numberType: input.numberType,
        providerMessagingServiceId: input.providerMessagingServiceId,
        providerPhoneNumberId: input.providerPhoneNumberId,
        regulatoryStatus: input.regulatoryStatus,
        failureReason: input.failureReason,
        provisionedAt: input.provisionedAt?.toISOString() ?? null,
        lastVerifiedAt: input.lastVerifiedAt?.toISOString() ?? null,
        createdAt: '2026-05-18T00:00:00.000Z',
        updatedAt: '2026-05-18T00:00:00.000Z',
      }),
    );

    const response = await testApp().request(
      '/v1/sms',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ countryCode: 'SE' }),
      },
      {
        SMS_SENDING_MODE: 'live',
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_API_KEY_SID: 'SK123',
        TWILIO_API_KEY_SECRET: 'secret',
        TWILIO_INBOUND_CALLBACK_BASE_URL: 'https://api.retaino.test',
        TWILIO_STATUS_CALLBACK_BASE_URL: 'https://api.retaino.test',
      },
    );

    expect(response.status).toBe(429);
    expect(captureHandledError).toHaveBeenCalledWith(
      expect.objectContaining({
        providerErrorCode: '429',
        retryable: true,
      }),
      expect.anything(),
      expect.objectContaining({
        feature: 'sms',
        operation: 'provider_request',
        provider: 'twilio',
        httpStatus: 429,
      }),
    );
  });
});

function activeBilling() {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    organizationId: organization.id,
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    stripePriceId: 'price_123',
    planKey: 'starter',
    subscriptionStatus: 'active',
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    syncedAt: new Date('2026-05-18T00:00:00.000Z'),
    createdAt: new Date('2026-05-18T00:00:00.000Z'),
    updatedAt: new Date('2026-05-18T00:00:00.000Z'),
  };
}
