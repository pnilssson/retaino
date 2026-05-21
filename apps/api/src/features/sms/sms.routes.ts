import {
  getOrganizationBillingProfile,
  getOrganizationSmsSender,
  upsertOrganizationSmsSender,
} from '@retaino/db';
import {
  provisionOrganizationSmsSenderSchema,
  smsSenderNumbersRequestSchema,
  type OrganizationSmsSender,
  type ProvisionSmsSenderSelection,
  type PublicOrganizationSmsSender,
  type PublicSmsSenderOption,
  type SmsSenderOption,
} from '@retaino/shared/contracts';
import { Hono, type Context } from 'hono';
import { apiError } from '../../lib/errors';
import { createSmsProvider, SmsProviderError } from '../../lib/sms-provider';
import { parseJsonBody } from '../../lib/route-helpers';
import type { AppEnv } from '../../types';
import { requireCampaignEligibility } from '../organization/organization.gates';

export const smsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    const organization = c.get('organization');
    const provider = createSmsProvider(c.env);
    const sender = await getOrganizationSmsSender(c.get('db'), {
      organizationId: organization.id,
      provider: provider.name,
    });

    return c.json({ sender: publicSender(sender) });
  })
  .get('/countries', async (c) => {
    const eligibility = await requireCampaignEligibility(c);

    if (!eligibility.ok) {
      return eligibility.response;
    }

    try {
      const provider = createSmsProvider(c.env);
      const countries = (await provider.listSenderCountries())
        .filter((country) => country.supportedNumberTypes.includes('mobile'))
        .map(({ countryCode, label, selfServeAvailable }) => ({
          countryCode,
          label,
          selfServeAvailable,
        }));

      return c.json({ countries });
    } catch (error) {
      return providerErrorResponse(c, error);
    }
  })
  .get('/numbers', async (c) => {
    const eligibility = await requireCampaignEligibility(c);

    if (!eligibility.ok) {
      return eligibility.response;
    }

    const parsed = smsSenderNumbersRequestSchema.safeParse({
      countryCode: c.req.query('countryCode'),
    });

    if (!parsed.success) {
      return c.json(
        apiError(
          'validation_failed',
          'Invalid sender number search.',
          parsed.error.flatten(),
        ),
        400,
      );
    }

    try {
      const provider = createSmsProvider(c.env);
      const numbers = (
        await provider.searchSenderOptions({
          countryCode: parsed.data.countryCode,
          numberType: 'mobile',
        })
      )
        .filter(isTwoWaySenderOption)
        .map(publicSenderOption);

      return c.json({ numbers });
    } catch (error) {
      return providerErrorResponse(c, error);
    }
  })
  .post('/', async (c) => {
    const eligibility = await requireCampaignEligibility(c);

    if (!eligibility.ok) {
      return eligibility.response;
    }

    const billing = await requireActiveBilling(c);

    if (!billing.ok) {
      return billing.response;
    }

    const parsed = await parseJsonBody(
      c,
      provisionOrganizationSmsSenderSchema,
      'Invalid sender selection.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    try {
      const db = c.get('db');
      const organization = c.get('organization');
      const provider = createSmsProvider(c.env);
      const existing = await getOrganizationSmsSender(db, {
        organizationId: organization.id,
        provider: provider.name,
      });

      if (existing?.status === 'ready') {
        return c.json({ sender: publicSender(existing) });
      }

      const selectedSender = await getProviderVerifiedSender(
        provider,
        parsed.data.selectedSender,
        existing,
      );
      const sameSelection = isSameSenderSelection(existing, selectedSender);
      const pendingSender = await upsertOrganizationSmsSender(db, {
        organizationId: organization.id,
        provider: provider.name,
        status: 'pending',
        phoneNumber: selectedSender.phoneNumber,
        countryCode: selectedSender.countryCode,
        numberType: selectedSender.numberType,
        providerMessagingServiceId:
          existing?.providerMessagingServiceId ?? null,
        providerPhoneNumberId: sameSelection
          ? (existing?.providerPhoneNumberId ?? null)
          : null,
        regulatoryStatus: sameSelection
          ? (existing?.regulatoryStatus ?? null)
          : null,
        failureReason: null,
        provisionedAt: sameSelection && existing?.provisionedAt
          ? new Date(existing.provisionedAt)
          : null,
        lastVerifiedAt: sameSelection && existing?.lastVerifiedAt
          ? new Date(existing.lastVerifiedAt)
          : null,
      });

      const result = await provider.ensureSender({
        organizationId: organization.id,
        actorUserId: c.get('user').id,
        selectedSender,
        existingProviderPhoneNumberId:
          pendingSender?.providerPhoneNumberId ?? null,
        inboundCallbackUrl: callbackUrl(
          c.env.TWILIO_INBOUND_CALLBACK_BASE_URL,
          '/v1/webhooks/twilio/messaging/inbound',
        ),
        statusCallbackUrl: callbackUrl(
          c.env.TWILIO_STATUS_CALLBACK_BASE_URL,
          '/v1/webhooks/twilio/messaging/status',
        ),
        idempotencyKey: organization.id,
      });
      const sender = await upsertOrganizationSmsSender(db, {
        organizationId: organization.id,
        provider: result.provider,
        status: result.status,
        phoneNumber: result.phoneNumber,
        countryCode: result.countryCode,
        numberType: result.numberType,
        providerMessagingServiceId: result.providerMessagingServiceId,
        providerPhoneNumberId: result.providerPhoneNumberId,
        regulatoryStatus: result.regulatoryStatus,
        failureReason: result.failureReason,
        provisionedAt: result.provisionedAt,
        lastVerifiedAt: result.lastVerifiedAt,
      });

      return c.json({ sender: publicSender(sender) }, 201);
    } catch (error) {
      return providerErrorResponse(c, error);
    }
  });

async function getProviderVerifiedSender(
  provider: ReturnType<typeof createSmsProvider>,
  selectedSender: ProvisionSmsSenderSelection,
  existing: {
    status: string;
    phoneNumber: string | null;
    countryCode: string | null;
    numberType: string | null;
  } | null,
) {
  if (
    existing?.status === 'pending' &&
    existing.phoneNumber === selectedSender.phoneNumber &&
    existing.countryCode === selectedSender.countryCode &&
    existing.numberType === 'mobile'
  ) {
    return {
      phoneNumber: selectedSender.phoneNumber,
      countryCode: selectedSender.countryCode,
      numberType: 'mobile' as const,
    };
  }

  const availableNumbers = (
    await provider.searchSenderOptions({
      countryCode: selectedSender.countryCode,
      numberType: 'mobile',
    })
  ).filter(isTwoWaySenderOption);
  const verifiedSender = availableNumbers.find(
    (option) => option.phoneNumber === selectedSender.phoneNumber,
  );

  if (!verifiedSender) {
    throw new SmsProviderError({
      code: 'message_invalid',
      retryable: false,
      publicMessage: 'Selected SMS sender is not available.',
    });
  }

  return verifiedSender;
}

function isTwoWaySenderOption(option: SmsSenderOption) {
  return (
    option.capabilities.outboundSms &&
    option.capabilities.inboundSms &&
    option.capabilities.twoWaySms
  );
}

function isSameSenderSelection(
  existing: {
    phoneNumber: string | null;
    countryCode: string | null;
    numberType: string | null;
  } | null,
  selectedSender: {
    phoneNumber: string;
    countryCode: string;
    numberType: string;
  },
) {
  return (
    existing?.phoneNumber === selectedSender.phoneNumber &&
    existing.countryCode === selectedSender.countryCode &&
    existing.numberType === selectedSender.numberType
  );
}

function publicSenderOption(option: SmsSenderOption): PublicSmsSenderOption {
  return {
    phoneNumber: option.phoneNumber,
    countryCode: option.countryCode,
    label: option.label,
  };
}

async function requireActiveBilling(c: Context<AppEnv>) {
  const profile = await getOrganizationBillingProfile(
    c.get('db'),
    c.get('organization').id,
  );

  if (profile?.subscriptionStatus !== 'active') {
    return {
      ok: false as const,
      response: c.json(
        apiError(
          'forbidden',
          'An active subscription is required before setting up SMS sending.',
        ),
        403,
      ),
    };
  }

  return { ok: true as const };
}

function callbackUrl(baseUrl: string | undefined, path: string) {
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function providerErrorResponse(c: Context<AppEnv>, error: unknown) {
  if (error instanceof SmsProviderError) {
    const { code, status } = providerHttpError(error);

    return c.json(
      apiError(code, error.publicMessage),
      status as 400 | 429 | 500 | 502 | 503,
    );
  }

  throw error;
}

function publicSender(
  sender: OrganizationSmsSender | null,
): PublicOrganizationSmsSender | null {
  if (!sender) {
    return null;
  }

  return {
    id: sender.id,
    organizationId: sender.organizationId,
    provider: sender.provider,
    status: sender.status,
    phoneNumber: sender.phoneNumber,
    countryCode: sender.countryCode,
    regulatoryStatus: sender.regulatoryStatus,
    failureReason: sender.failureReason,
    provisionedAt: sender.provisionedAt,
    lastVerifiedAt: sender.lastVerifiedAt,
    createdAt: sender.createdAt,
    updatedAt: sender.updatedAt,
  };
}

function providerHttpError(error: SmsProviderError) {
  if (error.code === 'provider_rate_limited') {
    return { code: 'internal_error' as const, status: 429 };
  }

  if (error.retryable) {
    return { code: 'internal_error' as const, status: 503 };
  }

  if (error.code === 'configuration_missing') {
    return { code: 'internal_error' as const, status: 500 };
  }

  if (
    error.code === 'provider_permanent_failure' ||
    error.code === 'provider_unavailable'
  ) {
    return { code: 'internal_error' as const, status: 502 };
  }

  return { code: 'validation_failed' as const, status: 400 };
}
