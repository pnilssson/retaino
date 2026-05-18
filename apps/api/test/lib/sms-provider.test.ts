import { describe, expect, it, vi } from 'vitest';
import {
  createSmsProvider,
  SmsProviderError,
} from '../../src/lib/sms-provider';

describe('SMS provider factory', () => {
  it('uses the deterministic fake provider in test mode', async () => {
    const fetchImpl = vi.fn();
    const provider = createSmsProvider(
      { SMS_SENDING_MODE: 'test' } as never,
      fetchImpl as never,
    );

    await expect(provider.listSenderCountries()).resolves.toContainEqual({
      countryCode: 'SE',
      label: 'Sweden',
      supportedNumberTypes: ['mobile'],
      selfServeAvailable: true,
    });
    await expect(
      provider.searchSenderOptions({ countryCode: 'SE' }),
    ).resolves.toMatchObject([
      {
        phoneNumber: '+46700000000',
        numberType: 'mobile',
      },
    ]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('blocks provider work when sending is disabled', async () => {
    const provider = createSmsProvider({ SMS_SENDING_MODE: 'disabled' } as never);

    await expect(provider.listSenderCountries()).rejects.toMatchObject({
      code: 'configuration_missing',
    });
  });

  it('uses Twilio API key credentials in live mode', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          available_phone_numbers: [],
        }),
        { status: 200 },
      ),
    );
    const provider = createSmsProvider(
      {
        SMS_SENDING_MODE: 'live',
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_API_KEY_SID: 'SK123',
        TWILIO_API_KEY_SECRET: 'secret',
      } as never,
      fetchImpl as never,
    );

    await provider.searchSenderOptions({ countryCode: 'US', numberType: 'local' });

    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;

    expect((request.headers as Headers).get('authorization')).toBe(
      `Basic ${btoa('SK123:secret')}`,
    );
  });

  it('rejects unsupported live sender markets before calling Twilio', async () => {
    const fetchImpl = vi.fn();
    const provider = createSmsProvider(
      {
        SMS_SENDING_MODE: 'live',
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_API_KEY_SID: 'SK123',
        TWILIO_API_KEY_SECRET: 'secret',
      } as never,
      fetchImpl as never,
    );

    await expect(
      provider.searchSenderOptions({ countryCode: 'FR', numberType: 'local' }),
    ).rejects.toMatchObject({
      code: 'message_invalid',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reuses existing Twilio sender resources during provisioning retries', async () => {
    const organizationId = '22222222-2222-4222-8222-222222222222';
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          services: [{ sid: 'MG_existing', friendly_name: `Retaino ${organizationId}` }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ sid: 'MG_existing' }))
      .mockResolvedValueOnce(
        jsonResponse({
          incoming_phone_numbers: [
            { sid: 'PN_existing', phone_number: '+15005550006' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          phone_numbers: [{ sid: 'PN_existing', phone_number: '+15005550006' }],
        }),
      );
    const provider = createSmsProvider(
      {
        SMS_SENDING_MODE: 'live',
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_API_KEY_SID: 'SK123',
        TWILIO_API_KEY_SECRET: 'secret',
        TWILIO_AUTH_TOKEN: 'auth-token',
      } as never,
      fetchImpl as never,
    );

    await expect(
      provider.ensureSender({
        organizationId,
        actorUserId: '11111111-1111-4111-8111-111111111111',
        idempotencyKey: organizationId,
        existingProviderPhoneNumberId: 'PN_existing',
        inboundCallbackUrl:
          'https://api.retaino.com/v1/webhooks/twilio/messaging/inbound',
        statusCallbackUrl:
          'https://api.retaino.com/v1/webhooks/twilio/messaging/status',
        selectedSender: {
          phoneNumber: '+15005550006',
          countryCode: 'US',
          numberType: 'local',
          capabilities: {
            outboundSms: true,
            inboundSms: true,
            statusCallbacks: true,
            twoWaySms: true,
            smartEncoding: false,
          },
          regulatoryRequirementSummary: null,
          providerReference: null,
          label: '+1 500 555 0006',
        },
      }),
    ).resolves.toMatchObject({
      providerMessagingServiceId: 'MG_existing',
      providerPhoneNumberId: 'PN_existing',
    });

    const createdServiceCalls = fetchImpl.mock.calls.filter(
      ([url, init]) =>
        new URL(String(url)).pathname === '/v1/Services' &&
        (init as RequestInit).method === 'POST',
    );
    const purchasedNumberCalls = fetchImpl.mock.calls.filter(
      ([url, init]) =>
        new URL(String(url)).pathname.endsWith('/IncomingPhoneNumbers.json') &&
        (init as RequestInit).method === 'POST',
    );

    expect(createdServiceCalls).toHaveLength(0);
    expect(purchasedNumberCalls).toHaveLength(0);
  });

  it('does not mark live Twilio senders ready without callbacks', async () => {
    const provider = createSmsProvider(
      {
        SMS_SENDING_MODE: 'live',
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_API_KEY_SID: 'SK123',
        TWILIO_API_KEY_SECRET: 'secret',
      } as never,
      vi.fn() as never,
    );

    await expect(
      provider.ensureSender({
        organizationId: '22222222-2222-4222-8222-222222222222',
        actorUserId: '11111111-1111-4111-8111-111111111111',
        idempotencyKey: '22222222-2222-4222-8222-222222222222',
        existingProviderPhoneNumberId: null,
        inboundCallbackUrl: null,
        statusCallbackUrl: null,
        selectedSender: {
          phoneNumber: '+15005550006',
          countryCode: 'US',
          numberType: 'local',
          capabilities: {
            outboundSms: true,
            inboundSms: true,
            statusCallbacks: true,
            twoWaySms: true,
            smartEncoding: false,
          },
          regulatoryRequirementSummary: null,
          providerReference: null,
          label: '+1 500 555 0006',
        },
      }),
    ).rejects.toMatchObject({
      code: 'configuration_missing',
    });
  });

  it('does not reuse account-owned Twilio numbers without stored sender ownership', async () => {
    const organizationId = '22222222-2222-4222-8222-222222222222';
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ services: [] }))
      .mockResolvedValueOnce(jsonResponse({ sid: 'MG_new' }))
      .mockResolvedValueOnce(
        jsonResponse({
          incoming_phone_numbers: [
            { sid: 'PN_other_org', phone_number: '+15005550006' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          phone_numbers: [],
        }),
      );
    const provider = createSmsProvider(
      {
        SMS_SENDING_MODE: 'live',
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_API_KEY_SID: 'SK123',
        TWILIO_API_KEY_SECRET: 'secret',
      } as never,
      fetchImpl as never,
    );

    await expect(
      provider.ensureSender({
        organizationId,
        actorUserId: '11111111-1111-4111-8111-111111111111',
        idempotencyKey: organizationId,
        existingProviderPhoneNumberId: null,
        inboundCallbackUrl:
          'https://api.retaino.com/v1/webhooks/twilio/messaging/inbound',
        statusCallbackUrl:
          'https://api.retaino.com/v1/webhooks/twilio/messaging/status',
        selectedSender: {
          phoneNumber: '+15005550006',
          countryCode: 'US',
          numberType: 'local',
          capabilities: {
            outboundSms: true,
            inboundSms: true,
            statusCallbacks: true,
            twoWaySms: true,
            smartEncoding: false,
          },
          regulatoryRequirementSummary: null,
          providerReference: null,
          label: '+1 500 555 0006',
        },
      }),
    ).rejects.toMatchObject({
      code: 'message_invalid',
    });

    const attachedNumberCalls = fetchImpl.mock.calls.filter(
      ([url, init]) =>
        new URL(String(url)).pathname.endsWith('/PhoneNumbers') &&
        (init as RequestInit).method === 'POST',
    );

    expect(attachedNumberCalls).toHaveLength(0);
  });

  it('fails Twilio webhook verification closed without an auth token', async () => {
    const provider = createSmsProvider(
      {
        SMS_SENDING_MODE: 'live',
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_API_KEY_SID: 'SK123',
        TWILIO_API_KEY_SECRET: 'secret',
      } as never,
      vi.fn() as never,
    );

    await expect(
      provider.verifyWebhook({
        url: 'https://api.retaino.com/v1/webhooks/twilio/messaging/status',
        headers: new Headers({
          'x-twilio-signature': 'anything',
          'content-type': 'application/x-www-form-urlencoded',
        }),
        body: 'MessageSid=SM123&MessageStatus=delivered',
      }),
    ).resolves.toBe(false);
  });

  it('validates Twilio webhook signatures with the auth token', async () => {
    const authToken = '12345';
    const url = 'https://api.retaino.com/v1/webhooks/twilio/messaging/status';
    const body = 'MessageStatus=delivered&MessageSid=SM123';
    const provider = createSmsProvider(
      {
        SMS_SENDING_MODE: 'live',
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_API_KEY_SID: 'SK123',
        TWILIO_API_KEY_SECRET: 'secret',
        TWILIO_AUTH_TOKEN: authToken,
      } as never,
      vi.fn() as never,
    );
    const signature = await signTwilioTestWebhook(authToken, url, body);

    await expect(
      provider.verifyWebhook({
        url,
        headers: new Headers({
          'x-twilio-signature': signature,
          'content-type': 'application/x-www-form-urlencoded',
        }),
        body,
      }),
    ).resolves.toBe(true);
    await expect(
      provider.verifyWebhook({
        url,
        headers: new Headers({
          'x-twilio-signature': 'invalid',
          'content-type': 'application/x-www-form-urlencoded',
        }),
        body,
      }),
    ).resolves.toBe(false);
  });

  it('fails clearly when live Twilio credentials are incomplete', () => {
    expect(() =>
      createSmsProvider({ SMS_SENDING_MODE: 'live' } as never),
    ).toThrow(SmsProviderError);
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

async function signTwilioTestWebhook(
  authToken: string,
  url: string,
  body: string,
) {
  const params = Array.from(new URLSearchParams(body).entries()).sort(
    ([left], [right]) => {
      if (left < right) {
        return -1;
      }

      if (left > right) {
        return 1;
      }

      return 0;
    },
  );
  const baseString = params.reduce(
    (value, [key, paramValue]) => `${value}${key}${paramValue}`,
    url,
  );
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(baseString),
  );

  return bytesToBase64(new Uint8Array(signature));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}
