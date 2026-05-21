import type {
  SmsSenderCapability,
  SmsSenderCountry,
  SmsSenderNumberType,
} from '@retaino/shared/contracts';
import type { AppEnv } from '../types';
import {
  SmsProviderError,
  type InboundSmsMessage,
  type OutboundSmsInput,
  type OutboundSmsResult,
  type SmsOutboundStatus,
  type SmsProvider,
  type SmsSenderProvisioningResult,
  type SmsStatusEvent,
} from './sms-provider';

type AppBindings = AppEnv['Bindings'];

type TwilioConfig = {
  accountSid: string;
  authUser: string;
  authSecret: string;
  authToken: string | null;
};

type TwilioAvailableNumber = {
  phone_number: string;
  friendly_name?: string;
  capabilities?: {
    SMS?: boolean;
    sms?: boolean;
    MMS?: boolean;
    mms?: boolean;
    voice?: boolean;
  };
};

type TwilioAvailableNumbersResponse = {
  available_phone_numbers?: TwilioAvailableNumber[];
};

type TwilioMessagingServiceResponse = {
  sid: string;
  friendly_name?: string;
};

type TwilioMessagingServicesResponse = {
  services?: TwilioMessagingServiceResponse[];
};

type TwilioPhoneNumberResponse = {
  sid: string;
  phone_number?: string;
  friendly_name?: string;
};

type TwilioIncomingPhoneNumbersResponse = {
  incoming_phone_numbers?: TwilioPhoneNumberResponse[];
};

type TwilioMessagingServicePhoneNumbersResponse = {
  phone_numbers?: Array<{
    sid?: string;
    phone_number_sid?: string;
    phone_number?: string;
  }>;
};

type TwilioMessageResponse = {
  sid: string;
  status?: string;
  num_segments?: string;
  price?: string;
  price_unit?: string;
};

const SENDER_CAPABILITIES: SmsSenderCapability = {
  outboundSms: true,
  inboundSms: true,
  statusCallbacks: true,
  twoWaySms: true,
  smartEncoding: false,
};

export function createTwilioSmsProvider(
  env: AppBindings,
  fetchImpl: typeof fetch = fetch,
): SmsProvider {
  const config = getTwilioConfig(env);
  const client = createTwilioRestClient(config, fetchImpl);

  return {
    name: 'twilio',
    listSenderCountries: async () => twilioSenderCountries(),
    searchSenderOptions: async (input) => {
      const countryCode = input.countryCode.toUpperCase();
      const numberType = input.numberType ?? defaultNumberType(countryCode);
      assertSupportedSenderRequest(countryCode, numberType);
      const data = await client.request<TwilioAvailableNumbersResponse>({
        host: 'api.twilio.com',
        method: 'GET',
        path:
          `/2010-04-01/Accounts/${config.accountSid}/AvailablePhoneNumbers` +
          `/${countryCode}/${twilioNumberTypePath(numberType)}.json`,
        query: { SmsEnabled: 'true' },
      });

      return (data.available_phone_numbers ?? [])
        .filter((number) => number.capabilities?.SMS ?? number.capabilities?.sms ?? true)
        .map((number) => ({
          phoneNumber: number.phone_number,
          countryCode,
          numberType,
          capabilities: SENDER_CAPABILITIES,
          regulatoryRequirementSummary: null,
          label: number.friendly_name ?? number.phone_number,
        }));
    },
    ensureSender: async (input) => {
      assertSupportedSenderRequest(
        input.selectedSender.countryCode,
        input.selectedSender.numberType,
      );

      const service = await ensureMessagingService(client, input);
      const phoneNumber = await ensureIncomingPhoneNumber(
        client,
        config,
        input,
        service.sid,
      );

      await ensurePhoneNumberAttached(client, service.sid, phoneNumber);

      const now = new Date();

      return {
        provider: 'twilio',
        status: 'ready',
        phoneNumber:
          phoneNumber.phone_number ?? input.selectedSender.phoneNumber,
        countryCode: input.selectedSender.countryCode,
        numberType: input.selectedSender.numberType,
        providerMessagingServiceId: service.sid,
        providerPhoneNumberId: phoneNumber.sid,
        capabilities: SENDER_CAPABILITIES,
        regulatoryStatus: 'ready',
        failureReason: null,
        provisionedAt: now,
        lastVerifiedAt: now,
      } satisfies SmsSenderProvisioningResult;
    },
    sendSms: async (input) => sendTwilioSms(client, config, input),
    parseStatusWebhook: async (input) => parseTwilioStatusWebhook(input),
    parseInboundWebhook: async (input) => parseTwilioInboundWebhook(input),
    verifyWebhook: async (input) => verifyTwilioWebhook(config, input),
  };
}

async function ensureMessagingService(
  client: ReturnType<typeof createTwilioRestClient>,
  input: {
    idempotencyKey: string;
    inboundCallbackUrl: string | null;
    statusCallbackUrl: string | null;
  },
) {
  const friendlyName = `Retaino ${input.idempotencyKey}`;
  const callbacks = requireCallbackUrls(input);
  const existing = await findMessagingService(client, friendlyName);
  const body = {
    FriendlyName: friendlyName,
    InboundRequestUrl: callbacks.inboundCallbackUrl,
    StatusCallback: callbacks.statusCallbackUrl,
    SmartEncoding: 'false',
    Usecase: 'marketing',
  };

  if (!existing) {
    return client.request<TwilioMessagingServiceResponse>({
      host: 'messaging.twilio.com',
      method: 'POST',
      path: '/v1/Services',
      body,
    });
  }

  return client.request<TwilioMessagingServiceResponse>({
    host: 'messaging.twilio.com',
    method: 'POST',
    path: `/v1/Services/${existing.sid}`,
    body,
  });
}

async function findMessagingService(
  client: ReturnType<typeof createTwilioRestClient>,
  friendlyName: string,
) {
  const response = await client.request<TwilioMessagingServicesResponse>({
    host: 'messaging.twilio.com',
    method: 'GET',
    path: '/v1/Services',
    query: { PageSize: '50' },
  });

  return (response.services ?? []).find(
    (service) => service.friendly_name === friendlyName,
  );
}

async function ensureIncomingPhoneNumber(
  client: ReturnType<typeof createTwilioRestClient>,
  config: TwilioConfig,
  input: {
    idempotencyKey: string;
    selectedSender: { phoneNumber: string };
    existingProviderPhoneNumberId: string | null;
    inboundCallbackUrl: string | null;
    statusCallbackUrl: string | null;
  },
  serviceSid: string,
) {
  const callbacks = requireCallbackUrls(input);
  const friendlyName = phoneNumberFriendlyName(input.idempotencyKey);
  const existing = await findIncomingPhoneNumber(
    client,
    config,
    input.selectedSender.phoneNumber,
  );

  if (existing) {
    if (
      input.existingProviderPhoneNumberId &&
      existing.sid === input.existingProviderPhoneNumberId
    ) {
      return existing;
    }

    if (
      existing.friendly_name === friendlyName ||
      (await isPhoneNumberAttached(client, serviceSid, existing))
    ) {
      return existing;
    }

    throw new SmsProviderError({
      code: 'message_invalid',
      retryable: false,
      publicMessage: 'Selected SMS sender is not available.',
      internalMessage:
        'Selected Twilio phone number is already owned by this account but is not linked to this organization sender.',
    });
  }

  if (input.existingProviderPhoneNumberId) {
    throw new SmsProviderError({
      code: 'sender_not_ready',
      retryable: false,
      publicMessage: 'The SMS sender is not ready.',
      internalMessage:
        'Stored Twilio phone number SID was not found on the Twilio account.',
    });
  }
  return client.request<TwilioPhoneNumberResponse>({
    host: 'api.twilio.com',
    method: 'POST',
    path: `/2010-04-01/Accounts/${config.accountSid}/IncomingPhoneNumbers.json`,
    body: {
      FriendlyName: friendlyName,
      PhoneNumber: input.selectedSender.phoneNumber,
      SmsUrl: callbacks.inboundCallbackUrl,
      StatusCallback: callbacks.statusCallbackUrl,
    },
  });
}

async function findIncomingPhoneNumber(
  client: ReturnType<typeof createTwilioRestClient>,
  config: TwilioConfig,
  phoneNumber: string,
) {
  const response = await client.request<TwilioIncomingPhoneNumbersResponse>({
    host: 'api.twilio.com',
    method: 'GET',
    path: `/2010-04-01/Accounts/${config.accountSid}/IncomingPhoneNumbers.json`,
    query: { PhoneNumber: phoneNumber },
  });

  return (response.incoming_phone_numbers ?? []).find(
    (number) => number.phone_number === phoneNumber,
  );
}

async function ensurePhoneNumberAttached(
  client: ReturnType<typeof createTwilioRestClient>,
  serviceSid: string,
  phoneNumber: TwilioPhoneNumberResponse,
) {
  const existing = await client.request<TwilioMessagingServicePhoneNumbersResponse>({
    host: 'messaging.twilio.com',
    method: 'GET',
    path: `/v1/Services/${serviceSid}/PhoneNumbers`,
    query: { PageSize: '50' },
  });

  const alreadyAttached = phoneNumberAttachedInResponse(existing, phoneNumber);

  if (alreadyAttached) {
    return;
  }

  await client.request({
    host: 'messaging.twilio.com',
    method: 'POST',
    path: `/v1/Services/${serviceSid}/PhoneNumbers`,
    body: {
      PhoneNumberSid: phoneNumber.sid,
    },
  });
}

async function isPhoneNumberAttached(
  client: ReturnType<typeof createTwilioRestClient>,
  serviceSid: string,
  phoneNumber: TwilioPhoneNumberResponse,
) {
  const existing = await client.request<TwilioMessagingServicePhoneNumbersResponse>({
    host: 'messaging.twilio.com',
    method: 'GET',
    path: `/v1/Services/${serviceSid}/PhoneNumbers`,
    query: { PageSize: '50' },
  });

  return phoneNumberAttachedInResponse(existing, phoneNumber);
}

function phoneNumberAttachedInResponse(
  response: TwilioMessagingServicePhoneNumbersResponse,
  phoneNumber: TwilioPhoneNumberResponse,
) {
  return (response.phone_numbers ?? []).some(
    (sender) =>
      sender.sid === phoneNumber.sid ||
      sender.phone_number_sid === phoneNumber.sid ||
      Boolean(
        phoneNumber.phone_number &&
          sender.phone_number === phoneNumber.phone_number,
      ),
  );
}

function twilioSenderCountries(): SmsSenderCountry[] {
  return [
    {
      countryCode: 'SE',
      label: 'Sweden',
      supportedNumberTypes: ['mobile'],
      selfServeAvailable: true,
    },
    {
      countryCode: 'US',
      label: 'United States',
      supportedNumberTypes: ['local', 'toll_free'],
      selfServeAvailable: true,
    },
  ];
}

function assertSupportedSenderRequest(
  countryCode: string,
  numberType: SmsSenderNumberType,
) {
  const country = twilioSenderCountries().find(
    (option) => option.countryCode === countryCode.toUpperCase(),
  );

  if (
    !country?.selfServeAvailable ||
    !country.supportedNumberTypes.includes(numberType)
  ) {
    throw new SmsProviderError({
      code: 'message_invalid',
      retryable: false,
      publicMessage: 'Selected SMS sender market is not available.',
    });
  }
}

function requireCallbackUrls(input: {
  inboundCallbackUrl: string | null;
  statusCallbackUrl: string | null;
}) {
  if (!input.inboundCallbackUrl || !input.statusCallbackUrl) {
    throw new SmsProviderError({
      code: 'configuration_missing',
      retryable: false,
      publicMessage: 'SMS sending is not configured.',
      internalMessage:
        'Twilio inbound and status callback URLs are required before provisioning a live sender.',
    });
  }

  return {
    inboundCallbackUrl: input.inboundCallbackUrl,
    statusCallbackUrl: input.statusCallbackUrl,
  };
}

function phoneNumberFriendlyName(idempotencyKey: string) {
  return `Retaino ${idempotencyKey}`;
}

async function sendTwilioSms(
  client: ReturnType<typeof createTwilioRestClient>,
  config: TwilioConfig,
  input: OutboundSmsInput,
): Promise<OutboundSmsResult> {
  if (input.organizationSender.status !== 'ready') {
    throw new SmsProviderError({
      code: 'sender_not_ready',
      retryable: false,
      publicMessage: 'The SMS sender is not ready.',
    });
  }

  if (!input.organizationSender.providerMessagingServiceId) {
    throw new SmsProviderError({
      code: 'sender_not_ready',
      retryable: false,
      publicMessage: 'The SMS sender is not ready.',
    });
  }

  const message = await client.request<TwilioMessageResponse>({
    host: 'api.twilio.com',
    method: 'POST',
    path: `/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    body: {
      To: input.to,
      Body: input.renderedBody,
      MessagingServiceSid: input.organizationSender.providerMessagingServiceId,
      StatusCallback: input.statusCallbackUrl ?? undefined,
      SmartEncoded: 'false',
    },
  });

  return {
    provider: 'twilio',
    providerMessageId: message.sid,
    normalizedStatus: normalizeTwilioStatus(message.status),
    providerStatus: message.status ?? null,
    providerSenderReference:
      input.organizationSender.providerMessagingServiceId,
    actualSegments: message.num_segments ? Number(message.num_segments) : null,
    cost: message.price ?? null,
    currency: message.price_unit ?? null,
    rawProviderReference: message.sid,
  };
}

function parseTwilioStatusWebhook(input: unknown): SmsStatusEvent {
  const payload = input as Record<string, string | undefined>;

  if (!payload.MessageSid && !payload.SmsSid) {
    throw new SmsProviderError({
      code: 'message_invalid',
      retryable: false,
      publicMessage: 'The provider status callback could not be read.',
    });
  }

  return {
    providerMessageId: payload.MessageSid ?? payload.SmsSid ?? '',
    retainoMessageReference: payload.MessageStatusCallbackEvent ?? null,
    normalizedStatus: normalizeTwilioStatus(payload.MessageStatus ?? payload.SmsStatus),
    providerStatus: payload.MessageStatus ?? payload.SmsStatus ?? null,
    occurredAt: new Date(),
    actualSegments: payload.NumSegments ? Number(payload.NumSegments) : null,
    cost: payload.Price ?? null,
    currency: payload.PriceUnit ?? null,
    providerErrorCode: payload.ErrorCode ?? null,
    providerErrorMessage: payload.ErrorMessage ?? null,
    rawProviderReference: payload.MessageSid ?? payload.SmsSid ?? null,
  };
}

function parseTwilioInboundWebhook(input: unknown): InboundSmsMessage {
  const payload = input as Record<string, string | undefined>;

  if (!payload.MessageSid && !payload.SmsSid) {
    throw new SmsProviderError({
      code: 'message_invalid',
      retryable: false,
      publicMessage: 'The inbound message could not be read.',
    });
  }

  return {
    providerMessageId: payload.MessageSid ?? payload.SmsSid ?? '',
    from: payload.From ?? '',
    to: payload.To ?? '',
    body: payload.Body ?? '',
    receivedAt: new Date(),
    providerSenderReference: payload.MessagingServiceSid ?? null,
    rawProviderReference: payload.MessageSid ?? payload.SmsSid ?? null,
  };
}

async function verifyTwilioWebhook(
  config: TwilioConfig,
  input: {
    url: string;
    headers: Headers;
    body: string;
  },
) {
  const signature = input.headers.get('x-twilio-signature');

  if (!config.authToken || !signature) {
    return false;
  }

  if (
    input.headers.get('content-type')?.toLowerCase().includes('application/json') &&
    !(await hasValidJsonBodyHash(input.url, input.body))
  ) {
    return false;
  }

  const expectedSignature = await signTwilioWebhook({
    authToken: config.authToken,
    url: input.url,
    body: input.body,
    contentType: input.headers.get('content-type') ?? '',
  });

  return constantTimeEqual(signature, expectedSignature);
}

async function signTwilioWebhook(input: {
  authToken: string;
  url: string;
  body: string;
  contentType: string;
}) {
  const baseString = twilioSignatureBaseString(input);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(input.authToken),
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

function twilioSignatureBaseString(input: {
  url: string;
  body: string;
  contentType: string;
}) {
  if (input.contentType.toLowerCase().includes('application/json')) {
    return input.url;
  }

  const params = Array.from(new URLSearchParams(input.body).entries()).sort(
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

  return params.reduce(
    (baseString, [key, value]) => `${baseString}${key}${value}`,
    input.url,
  );
}

async function hasValidJsonBodyHash(url: string, body: string) {
  const bodyHash = new URL(url).searchParams.get('bodySHA256');

  if (!bodyHash) {
    return false;
  }

  return constantTimeEqual(bodyHash, await sha256Hex(body));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function constantTimeEqual(left: string, right: string) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

function getTwilioConfig(env: AppBindings): TwilioConfig {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const apiKeySid = env.TWILIO_API_KEY_SID;
  const apiKeySecret = env.TWILIO_API_KEY_SECRET;
  const authToken = env.TWILIO_AUTH_TOKEN;

  if (!accountSid) {
    throw new SmsProviderError({
      code: 'configuration_missing',
      retryable: false,
      publicMessage: 'SMS sending is not configured.',
      internalMessage: 'TWILIO_ACCOUNT_SID is missing.',
    });
  }

  if (apiKeySid && apiKeySecret) {
    return {
      accountSid,
      authUser: apiKeySid,
      authSecret: apiKeySecret,
      authToken: authToken ?? null,
    };
  }

  if (authToken) {
    return {
      accountSid,
      authUser: accountSid,
      authSecret: authToken,
      authToken,
    };
  }

  throw new SmsProviderError({
    code: 'configuration_missing',
    retryable: false,
    publicMessage: 'SMS sending is not configured.',
    internalMessage:
      'TWILIO_API_KEY_SECRET or TWILIO_AUTH_TOKEN is missing.',
  });
}

function createTwilioRestClient(
  config: TwilioConfig,
  fetchImpl: typeof fetch,
) {
  return {
    request: async <TResponse = unknown>(input: {
      host: string;
      method: 'GET' | 'POST';
      path: string;
      query?: Record<string, string>;
      body?: Record<string, string | undefined>;
    }) => {
      const url = new URL(`https://${input.host}${input.path}`);

      Object.entries(input.query ?? {}).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      const headers = new Headers({
        authorization: `Basic ${toBasicAuth(config.authUser, config.authSecret)}`,
      });
      let body: URLSearchParams | undefined;

      if (input.body) {
        headers.set('content-type', 'application/x-www-form-urlencoded');
        body = new URLSearchParams();

        Object.entries(input.body).forEach(([key, value]) => {
          if (value !== undefined) {
            body?.set(key, value);
          }
        });
      }

      const requestInit: RequestInit = {
        method: input.method,
        headers,
      };

      if (body) {
        requestInit.body = body;
      }

      const response = await fetchImpl(url, requestInit);

      if (!response.ok) {
        throw new SmsProviderError({
          code: normalizeTwilioError(response.status),
          retryable: response.status === 429 || response.status >= 500,
          publicMessage: 'The SMS provider could not complete the request.',
          internalMessage: await response.text(),
          providerErrorCode: String(response.status),
        });
      }

      return (await response.json()) as TResponse;
    },
  };
}

function toBasicAuth(user: string, secret: string) {
  return btoa(`${user}:${secret}`);
}

function defaultNumberType(countryCode: string): SmsSenderNumberType {
  return countryCode === 'SE' ? 'mobile' : 'local';
}

function twilioNumberTypePath(numberType: SmsSenderNumberType) {
  if (numberType === 'toll_free') {
    return 'TollFree';
  }

  return numberType === 'mobile' ? 'Mobile' : 'Local';
}

function normalizeTwilioStatus(status: string | null | undefined): SmsOutboundStatus {
  if (status === 'delivered') {
    return 'delivered';
  }

  if (status === 'sent') {
    return 'sent';
  }

  if (status === 'failed') {
    return 'failed';
  }

  if (status === 'undelivered') {
    return 'undelivered';
  }

  if (status === 'accepted') {
    return 'accepted';
  }

  return 'queued';
}

function normalizeTwilioError(status: number) {
  if (status === 429) {
    return 'provider_rate_limited';
  }

  if (status >= 500) {
    return 'provider_temporary_failure';
  }

  if (status === 400) {
    return 'message_invalid';
  }

  if (status === 401 || status === 403) {
    return 'configuration_missing';
  }

  return 'provider_permanent_failure';
}
