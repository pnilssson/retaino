import {
  createInboundSmsMessage,
  deleteProviderOptOutSuppressionByHash,
  getLatestCampaignRecipientByPhoneHash,
  getOrganizationSmsSenderByProviderReference,
  getSmsMessageByProviderMessageId,
  recordCampaignMessageEvent,
  recordSmsMessageProviderResult,
  upsertSuppressionByHash,
} from '@retaino/db';
import {
  hashContactValue,
  normalizePhoneNumber,
} from '@retaino/shared/contracts';
import { Hono, type Context } from 'hono';
import { apiError } from '../../lib/errors';
import { captureOperationalMessage } from '../../lib/sentry';
import { createSmsProvider } from '../../lib/sms-provider';
import { providerCostMinor } from '../../lib/sms-cost';
import type { AppEnv } from '../../types';

export const twilioMessagingWebhookRoutes = new Hono<AppEnv>()
  .post('/status', async (c) => {
    const rawBody = await c.req.text();
    const provider = createSmsProvider(c.env);

    if (
      !(await provider.verifyWebhook({
        url: c.req.url,
        headers: c.req.raw.headers,
        body: rawBody,
      }))
    ) {
      return c.json(apiError('validation_failed', 'Invalid webhook signature.'), 400);
    }

    const payload = parseWebhookPayload(rawBody, c.req.header('content-type'));
    const event = await provider.parseStatusWebhook(payload);
    const message = await getSmsMessageByProviderMessageId(c.get('db'), {
      provider: provider.name,
      providerMessageId: event.providerMessageId,
    });

    if (!message) {
      return c.json({ received: true, status: 'ignored' });
    }

    await recordCampaignMessageEvent(c.get('db'), {
      organizationId: message.organizationId,
      campaignId: message.campaignId,
      messageId: message.id,
      recipientId: message.recipientId,
      provider: provider.name,
      providerMessageId: event.providerMessageId,
      eventType: event.normalizedStatus,
      rawStatus: event.providerStatus,
      rawPayload: payload,
      occurredAt: event.occurredAt,
    });
    await recordSmsMessageProviderResult(c.get('db'), {
      organizationId: message.organizationId,
      messageId: message.id,
      providerMessageId: event.providerMessageId,
      providerMessagingServiceId: message.providerMessagingServiceId,
      providerPhoneNumberId: message.providerPhoneNumberId,
      status: event.normalizedStatus,
      actualSegmentCount: event.actualSegments,
      actualCostMinor: providerCostMinor(event.cost),
      currency: event.currency,
      now: event.occurredAt,
    });

    return c.json({ received: true, status: 'processed' });
  })
  .post('/inbound', async (c) => {
    const rawBody = await c.req.text();
    const provider = createSmsProvider(c.env);

    if (
      !(await provider.verifyWebhook({
        url: c.req.url,
        headers: c.req.raw.headers,
        body: rawBody,
      }))
    ) {
      return c.json(apiError('validation_failed', 'Invalid webhook signature.'), 400);
    }

    const payload = parseWebhookPayload(rawBody, c.req.header('content-type'));
    const inbound = await provider.parseInboundWebhook(payload);
    const sender = await getOrganizationSmsSenderByProviderReference(c.get('db'), {
      provider: provider.name,
      providerMessagingServiceId: inbound.providerSenderReference,
      providerPhoneNumberId: null,
      phoneNumber: inbound.to,
    });

    if (!sender) {
      captureOperationalMessage('Ignored inbound SMS webhook for unknown sender.', c, {
        feature: 'sms',
        operation: 'inbound_unknown_sender',
        provider: provider.name,
        providerSenderReference: inbound.providerSenderReference,
      });
      return emptyTwimlResponse(c);
    }

    const phoneIdentity = await inboundPhoneIdentity(
      inbound.from,
      sender.countryCode ?? 'SE',
    );

    if (!phoneIdentity) {
      return emptyTwimlResponse(c);
    }

    const recipient = phoneIdentity
      ? await getLatestCampaignRecipientByPhoneHash(c.get('db'), {
          organizationId: sender.organizationId,
          phoneHash: phoneIdentity.valueHash,
        })
      : null;
    const message = await createInboundSmsMessage(c.get('db'), {
      organizationId: sender.organizationId,
      campaignId: recipient?.campaignId ?? null,
      recipientId: recipient?.id ?? null,
      contactId: recipient?.contactId ?? null,
      provider: provider.name,
      providerMessageId: inbound.providerMessageId,
      providerMessagingServiceId: inbound.providerSenderReference,
      providerPhoneNumberId: null,
      fromPhone: inbound.from,
      toPhone: inbound.to,
      normalizedPhone: phoneIdentity.normalizedValue,
      phoneHash: phoneIdentity.valueHash,
      body: inbound.body,
      receivedAt: inbound.receivedAt,
    });
    const optOutType = inbound.optOutType;
    const isOptOut =
      optOutType === 'STOP' || (!optOutType && isStopReply(inbound.body));
    const isOptIn =
      optOutType === 'START' || (!optOutType && isStartReply(inbound.body));
    const eventType = isOptOut ? 'opt_out' : isOptIn ? 'opt_in' : 'reply';

    if (isOptOut) {
      await upsertSuppressionByHash(c.get('db'), {
        organizationId: sender.organizationId,
        type: 'phone',
        value: inbound.from,
        normalizedValue: phoneIdentity.normalizedValue,
        valueHash: phoneIdentity.valueHash,
        reason: 'provider_opt_out',
        source: 'twilio',
      });
    }

    if (isOptIn) {
      await deleteProviderOptOutSuppressionByHash(c.get('db'), {
        organizationId: sender.organizationId,
        type: 'phone',
        valueHash: phoneIdentity.valueHash,
        source: provider.name,
      });
    }

    if (message) {
      await recordCampaignMessageEvent(c.get('db'), {
        organizationId: sender.organizationId,
        campaignId: message.campaignId,
        messageId: message.id,
        recipientId: message.recipientId,
        provider: provider.name,
        providerMessageId: inbound.providerMessageId,
        eventType,
        rawStatus: optOutType,
        rawPayload: payload,
        occurredAt: inbound.receivedAt,
      });
    }

    return emptyTwimlResponse(c);
  });

function parseWebhookPayload(rawBody: string, contentType: string | undefined) {
  if (contentType?.toLowerCase().includes('application/json')) {
    const parsed = JSON.parse(rawBody) as unknown;
    return isRecord(parsed) ? parsed : {};
  }

  return Object.fromEntries(new URLSearchParams(rawBody).entries());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStopReply(body: string) {
  return /^(stop|stopall|unsubscribe|cancel|end|quit|revoke|optout|block)$/i.test(
    body.trim(),
  );
}

function isStartReply(body: string) {
  return /^start$/i.test(body.trim());
}

function emptyTwimlResponse(c: Context<AppEnv>) {
  return c.body('<Response></Response>', 200, {
    'content-type': 'text/xml; charset=utf-8',
  });
}

async function inboundPhoneIdentity(value: string, countryCode: string) {
  const normalized = normalizePhoneNumber(value, countryCode);

  if (!normalized.ok) {
    return null;
  }

  return {
    normalizedValue: normalized.normalizedPhone,
    valueHash: await hashContactValue(normalized.normalizedPhone),
  };
}
