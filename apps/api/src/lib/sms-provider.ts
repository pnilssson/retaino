import type {
  OrganizationSmsSender,
  SmsSenderCountry,
  SmsSenderNumberType,
  SmsSenderProvider,
  SmsSenderStatus,
} from '@retaino/shared/contracts';
import type { AppEnv } from '../types';
import { createTwilioSmsProvider } from './twilio-provider';

export type SmsProviderName = SmsSenderProvider;

export type SmsSenderCapability = {
  outboundSms: boolean;
  inboundSms: boolean;
  statusCallbacks: boolean;
  twoWaySms: boolean;
  smartEncoding?: boolean;
};

export type SmsSenderProvisioningInput = {
  organizationId: string;
  actorUserId: string;
  countryCode: string;
  existingPhoneNumber: string | null;
  existingProviderPhoneNumberId: string | null;
  inboundCallbackUrl: string | null;
  statusCallbackUrl: string | null;
  idempotencyKey: string;
};

export type SmsSenderProvisioningResult = {
  provider: SmsProviderName;
  status: SmsSenderStatus;
  phoneNumber: string | null;
  countryCode: string | null;
  numberType: SmsSenderNumberType | null;
  providerMessagingServiceId: string | null;
  providerPhoneNumberId: string | null;
  capabilities: SmsSenderCapability | null;
  regulatoryStatus: string | null;
  failureReason: string | null;
  provisionedAt: Date | null;
  lastVerifiedAt: Date | null;
};

export type OutboundSmsInput = {
  retainoMessageId: string;
  organizationSender: OrganizationSmsSender;
  to: string;
  renderedBody: string;
  estimatedSegments: number;
  statusCallbackUrl: string | null;
  reference: string;
};

export type OutboundSmsResult = {
  provider: SmsProviderName;
  providerMessageId: string;
  normalizedStatus: SmsOutboundStatus;
  providerStatus: string | null;
  providerSenderReference: string | null;
  actualSegments: number | null;
  cost: string | null;
  currency: string | null;
  rawProviderReference: string | null;
};

export type SmsOutboundStatus =
  | 'queued'
  | 'accepted'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'undelivered'
  | 'skipped';

export type SmsStatusEvent = {
  providerMessageId: string;
  retainoMessageReference: string | null;
  normalizedStatus: SmsOutboundStatus;
  providerStatus: string | null;
  occurredAt: Date;
  actualSegments: number | null;
  cost: string | null;
  currency: string | null;
  providerErrorCode: string | null;
  providerErrorMessage: string | null;
  rawProviderReference: string | null;
};

export type InboundSmsMessage = {
  providerMessageId: string;
  from: string;
  to: string;
  body: string;
  receivedAt: Date;
  providerSenderReference: string | null;
  rawProviderReference: string | null;
};

export type SmsProviderErrorCode =
  | 'configuration_missing'
  | 'sender_not_ready'
  | 'manual_action_required'
  | 'regulatory_blocked'
  | 'recipient_invalid'
  | 'message_invalid'
  | 'provider_rate_limited'
  | 'provider_temporary_failure'
  | 'provider_permanent_failure'
  | 'provider_unavailable';

export class SmsProviderError extends Error {
  readonly code: SmsProviderErrorCode;
  readonly retryable: boolean;
  readonly publicMessage: string;
  readonly providerErrorCode: string | null;

  constructor(input: {
    code: SmsProviderErrorCode;
    retryable: boolean;
    publicMessage: string;
    internalMessage?: string;
    providerErrorCode?: string | null;
  }) {
    super(input.internalMessage ?? input.publicMessage);
    this.name = 'SmsProviderError';
    this.code = input.code;
    this.retryable = input.retryable;
    this.publicMessage = input.publicMessage;
    this.providerErrorCode = input.providerErrorCode ?? null;
  }
}

export type SmsProvider = {
  name: SmsProviderName;
  listSenderCountries: () => Promise<SmsSenderCountry[]>;
  ensureSender: (
    input: SmsSenderProvisioningInput,
  ) => Promise<SmsSenderProvisioningResult>;
  sendSms: (input: OutboundSmsInput) => Promise<OutboundSmsResult>;
  parseStatusWebhook: (input: unknown) => Promise<SmsStatusEvent>;
  parseInboundWebhook: (input: unknown) => Promise<InboundSmsMessage>;
  verifyWebhook: (input: {
    url: string;
    headers: Headers;
    body: string;
  }) => Promise<boolean>;
};

type AppBindings = AppEnv['Bindings'];

export function createSmsProvider(
  env: AppBindings,
  fetchImpl: typeof fetch = fetch,
): SmsProvider {
  const mode = env.SMS_SENDING_MODE ?? 'disabled';

  if (mode === 'test') {
    return createFakeSmsProvider();
  }

  if (mode === 'live') {
    return createTwilioSmsProvider(env, fetchImpl);
  }

  return createDisabledSmsProvider();
}

export function createFakeSmsProvider(): SmsProvider {
  const countries: SmsSenderCountry[] = [
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
  const capabilities: SmsSenderCapability = {
    outboundSms: true,
    inboundSms: true,
    statusCallbacks: true,
    twoWaySms: true,
    smartEncoding: false,
  };
  const senders: Array<{
    phoneNumber: string;
    countryCode: string;
    numberType: SmsSenderNumberType;
  }> = [
    {
      phoneNumber: '+46700000000',
      countryCode: 'SE',
      numberType: 'mobile',
    },
    {
      phoneNumber: '+15005550006',
      countryCode: 'US',
      numberType: 'local',
    },
    {
      phoneNumber: '+18885550123',
      countryCode: 'US',
      numberType: 'toll_free',
    },
  ];

  return {
    name: 'fake',
    listSenderCountries: async () => countries,
    ensureSender: async (input) => {
      const countryCode = input.countryCode.toUpperCase();
      const sender = input.existingPhoneNumber
        ? {
            phoneNumber: input.existingPhoneNumber,
            countryCode,
            numberType: 'mobile' as const,
          }
        : senders.find(
            (option) =>
              option.countryCode === countryCode && option.numberType === 'mobile',
          );

      if (!sender) {
        throw new SmsProviderError({
          code: 'message_invalid',
          retryable: false,
          publicMessage: 'SMS sender setup is not available for this country.',
        });
      }

      return {
        provider: 'fake',
        status: 'ready',
        phoneNumber: sender.phoneNumber,
        countryCode: sender.countryCode,
        numberType: sender.numberType,
        providerMessagingServiceId: `fake-ms-${input.organizationId}`,
        providerPhoneNumberId:
          `fake-pn-${sender.phoneNumber.replace(/\D/g, '')}`,
        capabilities,
        regulatoryStatus: 'not_required',
        failureReason: null,
        provisionedAt: new Date(),
        lastVerifiedAt: new Date(),
      };
    },
    sendSms: async (input) => sendFakeSms(input),
    parseStatusWebhook: async (input) => parseFakeStatusWebhook(input),
    parseInboundWebhook: async (input) => parseFakeInboundWebhook(input),
    verifyWebhook: async () => true,
  };
}

function sendFakeSms(input: OutboundSmsInput): Promise<OutboundSmsResult> {
  if (input.to === '+15005550001') {
    throw new SmsProviderError({
      code: 'recipient_invalid',
      retryable: false,
      publicMessage: 'The recipient phone number is invalid.',
    });
  }

  if (input.to === '+15005550002') {
    throw new SmsProviderError({
      code: 'provider_temporary_failure',
      retryable: true,
      publicMessage: 'The SMS provider is temporarily unavailable.',
    });
  }

  if (input.to === '+15005550003') {
    throw new SmsProviderError({
      code: 'provider_permanent_failure',
      retryable: false,
      publicMessage: 'The SMS provider rejected the message.',
    });
  }

  return Promise.resolve({
    provider: 'fake',
    providerMessageId: `fake-message-${input.retainoMessageId}`,
    normalizedStatus: 'queued',
    providerStatus: 'queued',
    providerSenderReference: input.organizationSender.providerMessagingServiceId,
    actualSegments: input.estimatedSegments,
    cost: '0',
    currency: 'SEK',
    rawProviderReference: `fake-message-${input.retainoMessageId}`,
  });
}

function parseFakeStatusWebhook(input: unknown): Promise<SmsStatusEvent> {
  const payload = fakeWebhookPayload(input);
  const providerMessageId = payload.MessageSid ?? payload.SmsSid;

  if (!providerMessageId) {
    throw new SmsProviderError({
      code: 'message_invalid',
      retryable: false,
      publicMessage: 'The provider status callback could not be read.',
    });
  }

  return Promise.resolve({
    providerMessageId,
    retainoMessageReference: payload.MessageStatusCallbackEvent ?? null,
    normalizedStatus: normalizeFakeStatus(
      payload.MessageStatus ?? payload.SmsStatus,
    ),
    providerStatus: payload.MessageStatus ?? payload.SmsStatus ?? null,
    occurredAt: new Date(),
    actualSegments: payload.NumSegments ? Number(payload.NumSegments) : null,
    cost: payload.Price ?? null,
    currency: payload.PriceUnit ?? null,
    providerErrorCode: payload.ErrorCode ?? null,
    providerErrorMessage: payload.ErrorMessage ?? null,
    rawProviderReference: providerMessageId,
  });
}

function parseFakeInboundWebhook(input: unknown): Promise<InboundSmsMessage> {
  const payload = fakeWebhookPayload(input);
  const providerMessageId = payload.MessageSid ?? payload.SmsSid;

  if (!providerMessageId) {
    throw new SmsProviderError({
      code: 'message_invalid',
      retryable: false,
      publicMessage: 'The inbound message could not be read.',
    });
  }

  return Promise.resolve({
    providerMessageId,
    from: payload.From ?? '',
    to: payload.To ?? '',
    body: payload.Body ?? '',
    receivedAt: new Date(),
    providerSenderReference: payload.MessagingServiceSid ?? null,
    rawProviderReference: providerMessageId,
  });
}

function fakeWebhookPayload(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {} as Record<string, string | undefined>;
  }

  return input as Record<string, string | undefined>;
}

function normalizeFakeStatus(
  status: string | null | undefined,
): SmsOutboundStatus {
  if (
    status === 'delivered' ||
    status === 'sent' ||
    status === 'failed' ||
    status === 'undelivered' ||
    status === 'accepted'
  ) {
    return status;
  }

  return 'queued';
}

function createDisabledSmsProvider(): SmsProvider {
  const fail = async () => {
    throw new SmsProviderError({
      code: 'configuration_missing',
      retryable: false,
      publicMessage: 'SMS sending is not configured.',
    });
  };

  return {
    name: 'fake',
    listSenderCountries: fail,
    ensureSender: fail,
    sendSms: fail,
    parseStatusWebhook: fail,
    parseInboundWebhook: fail,
    verifyWebhook: async () => false,
  };
}
