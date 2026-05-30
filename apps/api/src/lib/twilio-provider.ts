import type {
  SmsSenderCountry,
} from '@retaino/shared/contracts';
import type { AppEnv } from '../types';
import {
  SmsProviderError,
  type InboundSmsMessage,
  type OutboundSmsInput,
  type OutboundSmsResult,
  type SmsSenderCapability,
  type SmsOutboundStatus,
  type SmsProvider,
  type SmsSenderProvisioningResult,
  type SmsStatusEvent,
} from './sms-provider';
import {
  createTwilioRestClient,
  getTwilioConfig,
  type TwilioConfig,
} from './twilio-rest-client';
import { positiveSmsSegmentCount } from './sms-segments';
import { verifyTwilioWebhook } from './twilio-webhook-verification';

type AppBindings = AppEnv['Bindings'];

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
    ensureSender: async (input) => {
      const countryCode = input.countryCode.toUpperCase();
      const numberType = 'mobile';

      assertSupportedMobileSenderCountry(countryCode);

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
        phoneNumber: phoneNumber.phone_number ?? null,
        countryCode,
        numberType,
        providerMessagingServiceId: service.sid,
        providerPhoneNumberId: phoneNumber.sid,
        capabilities: SENDER_CAPABILITIES,
        regulatoryStatus: 'ready',
        failureReason: null,
        provisionedAt: now,
        lastVerifiedAt: now,
      } satisfies SmsSenderProvisioningResult;
    },
    releaseSender: async (input) => releaseTwilioSender(client, config, input),
    sendSms: async (input) => sendTwilioSms(client, config, input),
    parseStatusWebhook: async (input) => parseTwilioStatusWebhook(input),
    parseInboundWebhook: async (input) => parseTwilioInboundWebhook(input),
    verifyWebhook: async (input) => verifyTwilioWebhook(config, input),
  };
}

async function releaseTwilioSender(
  client: ReturnType<typeof createTwilioRestClient>,
  config: TwilioConfig,
  input: {
    providerMessagingServiceId: string | null;
    providerPhoneNumberId: string | null;
  },
) {
  if (input.providerPhoneNumberId) {
    await ignoreMissingTwilioResource(() =>
      client.request({
        host: 'api.twilio.com',
        method: 'DELETE',
        path:
          `/2010-04-01/Accounts/${config.accountSid}/IncomingPhoneNumbers/` +
          `${input.providerPhoneNumberId}.json`,
      }),
    );
  }

  if (input.providerMessagingServiceId) {
    await ignoreMissingTwilioResource(() =>
      client.request({
        host: 'messaging.twilio.com',
        method: 'DELETE',
        path: `/v1/Services/${input.providerMessagingServiceId}`,
      }),
    );
  }
}

async function ignoreMissingTwilioResource(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    if (
      error instanceof SmsProviderError &&
      error.providerErrorCode === '20404'
    ) {
      return;
    }

    throw error;
  }
}

async function searchTwilioAvailableMobileNumbers(
  client: ReturnType<typeof createTwilioRestClient>,
  config: TwilioConfig,
  countryCode: string,
) {
  const normalizedCountryCode = countryCode.toUpperCase();

  assertSupportedMobileSenderCountry(normalizedCountryCode);

  const data = await client.request<TwilioAvailableNumbersResponse>({
    host: 'api.twilio.com',
    method: 'GET',
    path:
      `/2010-04-01/Accounts/${config.accountSid}/AvailablePhoneNumbers` +
      `/${normalizedCountryCode}/Mobile.json`,
    query: { SmsEnabled: 'true' },
  });

  return (data.available_phone_numbers ?? []).filter(
    (number) => number.capabilities?.SMS ?? number.capabilities?.sms ?? true,
  );
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
    countryCode: string;
    existingPhoneNumber: string | null;
    existingProviderPhoneNumberId: string | null;
    inboundCallbackUrl: string | null;
    statusCallbackUrl: string | null;
  },
  serviceSid: string,
) {
  const callbacks = requireCallbackUrls(input);
  const friendlyName = phoneNumberFriendlyName(input.idempotencyKey);
  const existingCandidate = input.existingPhoneNumber;

  if (existingCandidate) {
    try {
      return await ensureCandidatePhoneNumber(
        client,
        config,
        input,
        serviceSid,
        callbacks,
        friendlyName,
        existingCandidate,
      );
    } catch (error) {
      if (!isTwilioPhoneNumberUnavailableError(error)) {
        throw error;
      }
    }
  }

  const candidates = await senderCandidates(client, config, input);

  for (const candidate of candidates) {
    try {
      return await ensureCandidatePhoneNumber(
        client,
        config,
        input,
        serviceSid,
        callbacks,
        friendlyName,
        candidate,
      );
    } catch (error) {
      if (!isTwilioPhoneNumberUnavailableError(error)) {
        throw error;
      }
    }
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

  throw new SmsProviderError({
    code: 'message_invalid',
    retryable: false,
    publicMessage: 'SMS sender setup is not available for this country.',
    internalMessage:
      'No available Twilio phone numbers could be provisioned for the requested country.',
  });
}

async function ensureCandidatePhoneNumber(
  client: ReturnType<typeof createTwilioRestClient>,
  config: TwilioConfig,
  input: {
    existingProviderPhoneNumberId: string | null;
  },
  serviceSid: string,
  callbacks: {
    inboundCallbackUrl: string;
    statusCallbackUrl: string;
  },
  friendlyName: string,
  phoneNumber: string,
) {
  const existing = await findIncomingPhoneNumber(
    client,
    config,
    phoneNumber,
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
      publicMessage: 'SMS sender setup is not available for this country.',
      internalMessage:
        'Twilio phone number is already owned by this account but is not linked to this organization sender.',
    });
  }

  return client.request<TwilioPhoneNumberResponse>({
    host: 'api.twilio.com',
    method: 'POST',
    path: `/2010-04-01/Accounts/${config.accountSid}/IncomingPhoneNumbers.json`,
    body: {
      FriendlyName: friendlyName,
      PhoneNumber: phoneNumber,
      SmsUrl: callbacks.inboundCallbackUrl,
      StatusCallback: callbacks.statusCallbackUrl,
    },
  });
}

async function senderCandidates(
  client: ReturnType<typeof createTwilioRestClient>,
  config: TwilioConfig,
  input: {
    countryCode: string;
  },
) {
  const available = await searchTwilioAvailableMobileNumbers(
    client,
    config,
    input.countryCode,
  );

  return available.map((number) => number.phone_number);
}

function isTwilioPhoneNumberUnavailableError(error: unknown) {
  return error instanceof SmsProviderError && error.providerErrorCode === '21422';
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

function assertSupportedMobileSenderCountry(countryCode: string) {
  const country = twilioSenderCountries().find(
    (option) => option.countryCode === countryCode.toUpperCase(),
  );

  if (
    !country?.selfServeAvailable ||
    !country.supportedNumberTypes.includes('mobile')
  ) {
    throw new SmsProviderError({
      code: 'message_invalid',
      retryable: false,
      publicMessage: 'SMS sender setup is not available for this country.',
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
    actualSegments: positiveSmsSegmentCount(message.num_segments),
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
    actualSegments: positiveSmsSegmentCount(payload.NumSegments),
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
