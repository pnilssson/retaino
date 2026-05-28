import {
  getOrganizationBillingProfile,
  getOrganizationSmsSender,
  upsertOrganizationSmsSender,
} from '@retaino/db';
import {
  provisionOrganizationSmsSenderSchema,
  type OrganizationSmsSender,
  type PublicOrganizationSmsSender,
  type SmsSenderCountry,
} from '@retaino/shared/contracts';
import { Hono, type Context } from 'hono';
import { callbackUrl } from '../../lib/callback-url';
import { apiError } from '../../lib/errors';
import { captureHandledError } from '../../lib/sentry';
import { createSmsProvider, SmsProviderError } from '../../lib/sms-provider';
import { smsSenderPublicStatus } from '../../lib/sms-sender-readiness';
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
        .filter(isProvisionableMobileSenderCountry)
        .map(({ countryCode, label }) => ({
          countryCode,
          label,
        }));

      return c.json({ countries });
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

      const countryCode = await getProviderVerifiedCountry(
        provider,
        parsed.data.countryCode,
      );
      const sameCountry =
        existing?.countryCode === countryCode &&
        existing.numberType === 'mobile';
      const pendingSender = await upsertOrganizationSmsSender(db, {
        organizationId: organization.id,
        provider: provider.name,
        status: 'pending',
        phoneNumber: sameCountry ? (existing?.phoneNumber ?? null) : null,
        countryCode,
        numberType: 'mobile',
        providerMessagingServiceId:
          existing?.providerMessagingServiceId ?? null,
        providerPhoneNumberId: sameCountry
          ? (existing?.providerPhoneNumberId ?? null)
          : null,
        regulatoryStatus: sameCountry
          ? (existing?.regulatoryStatus ?? null)
          : null,
        failureReason: null,
        provisionedAt: sameCountry && existing?.provisionedAt
          ? new Date(existing.provisionedAt)
          : null,
        lastVerifiedAt: sameCountry && existing?.lastVerifiedAt
          ? new Date(existing.lastVerifiedAt)
          : null,
      });

      let result;

      try {
        result = await provider.ensureSender({
          organizationId: organization.id,
          actorUserId: c.get('user').id,
          countryCode,
          existingPhoneNumber:
            sameCountry ? (pendingSender?.phoneNumber ?? null) : null,
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
      } catch (error) {
        await upsertOrganizationSmsSender(db, {
          organizationId: organization.id,
          provider: provider.name,
          status: 'failed',
          phoneNumber: pendingSender?.phoneNumber ?? null,
          countryCode,
          numberType: 'mobile',
          providerMessagingServiceId:
            pendingSender?.providerMessagingServiceId ?? null,
          providerPhoneNumberId: pendingSender?.providerPhoneNumberId ?? null,
          regulatoryStatus: pendingSender?.regulatoryStatus ?? null,
          failureReason:
            'The sender could not be set up automatically. Try again or contact support if this keeps happening.',
          provisionedAt: null,
          lastVerifiedAt: null,
        });

        throw error;
      }
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

async function getProviderVerifiedCountry(
  provider: ReturnType<typeof createSmsProvider>,
  countryCode: string,
) {
  const availableCountry = (await provider.listSenderCountries()).find(
    (country) =>
      country.countryCode === countryCode &&
      isProvisionableMobileSenderCountry(country),
  );

  if (!availableCountry) {
    throw new SmsProviderError({
      code: 'message_invalid',
      retryable: false,
      publicMessage: 'SMS sender setup is not available for this country.',
    });
  }

  return availableCountry.countryCode;
}

function isProvisionableMobileSenderCountry(country: SmsSenderCountry) {
  return (
    country.supportedNumberTypes.includes('mobile') &&
    country.selfServeAvailable
  );
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

function providerErrorResponse(c: Context<AppEnv>, error: unknown) {
  if (error instanceof SmsProviderError) {
    const { code, status } = providerHttpError(error);

    captureHandledError(error, c, {
      feature: 'sms',
      operation: 'provider_request',
      provider: c.env.SMS_SENDING_MODE === 'live' ? 'twilio' : 'fake',
      providerErrorCode: error.providerErrorCode,
      retryable: error.retryable,
      httpStatus: status,
    });

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
    status: smsSenderPublicStatus(sender),
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
