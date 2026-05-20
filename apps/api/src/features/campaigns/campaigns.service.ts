import {
  createAuditLog,
  createOutboundSmsMessage,
  findSuppressionByHash,
  getCampaignById,
  getCurrentLegalBundle,
  getCurrentOrganizationLegalAcceptance,
  getOrganizationProfileByOrganizationId,
  getOrganizationSmsSender,
  listSelectedCampaignRecipientsForSend,
  markCampaignRecipientSent,
  markCampaignRecipientSkipped,
  markCampaignSendCompleted,
  recordSmsMessageProviderResult,
  startCampaignSend,
  upsertTrackingLink,
  type CampaignRecipientForSend,
  type DbClient,
} from '@retaino/db';
import { renderCampaignSms } from '@retaino/shared';
import type { Campaign } from '@retaino/shared/contracts';
import {
  debitSmsCreditUsage,
  releaseSmsCreditUsage,
} from '../billing/billing.service';
import { callbackUrl } from '../../lib/callback-url';
import { createSmsProvider } from '../../lib/sms-provider';
import { providerCostMinor } from '../../lib/sms-cost';
import type { AppEnv } from '../../types';

type CampaignSendResult = {
  campaign: Campaign | null;
  sentCount: number;
  skippedCount: number;
  reservedCreditCount: number;
  actualCreditCount: number;
};

type PreparedRecipient = {
  recipient: CampaignRecipientForSend;
  renderedBody: string;
  estimatedSegments: number;
};

export async function processCampaignSend(input: {
  db: DbClient;
  env: AppEnv['Bindings'];
  organizationId: string;
  campaignId: string;
  userId: string;
}): Promise<CampaignSendResult> {
  const trackingBaseUrl = input.env.TRACKING_BASE_URL;

  if (!trackingBaseUrl) {
    throw new Error('Campaign send processing is missing TRACKING_BASE_URL.');
  }

  const [campaign, profile, legalBundle] = await Promise.all([
    getCampaignById(input.db, {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
    }),
    getOrganizationProfileByOrganizationId(input.db, input.organizationId),
    getCurrentLegalBundle(input.db),
  ]);

  if (!campaign) {
    throw new Error('Campaign was not found.');
  }

  if (campaign.status !== 'ready_to_send' && campaign.status !== 'sending') {
    throw new Error('Campaign is not ready to send.');
  }

  if (!campaign.smsBody || !campaign.bookingUrl) {
    throw new Error('Campaign message and booking link are required.');
  }

  if (!profile) {
    throw new Error('Organization setup must be complete before sending.');
  }

  const legalAcceptance = await getCurrentOrganizationLegalAcceptance(input.db, {
    organizationId: input.organizationId,
    bundleVersion: legalBundle.version,
  });

  if (!legalAcceptance || legalAcceptance.bundleHash !== legalBundle.hash) {
    throw new Error('Legal agreement must be current before sending.');
  }

  const provider = createSmsProvider(input.env);
  const sender = await getOrganizationSmsSender(input.db, {
    organizationId: input.organizationId,
    provider: provider.name,
  });

  if (
    !sender ||
    sender.status !== 'ready' ||
    !sender.providerMessagingServiceId
  ) {
    throw new Error('SMS sender must be ready before sending.');
  }

  const { recipients } = await listSelectedCampaignRecipientsForSend(input.db, {
    organizationId: input.organizationId,
    campaignId: input.campaignId,
  });
  const preparedRecipients = await prepareRecipients({
    db: input.db,
    campaign,
    recipients,
    trackingBaseUrl,
  });
  const reservedCreditCount = preparedRecipients.reduce(
    (sum, prepared) => sum + prepared.estimatedSegments,
    0,
  );
  const sourceId = `campaign-send:${input.campaignId}`;
  const hasExistingReservation =
    campaign.status === 'sending' && campaign.reservedCreditCount !== null;
  const reservedTransactions =
    reservedCreditCount > 0 && !hasExistingReservation
      ? await debitSmsCreditUsage({
          db: input.db,
          organizationId: input.organizationId,
          actualSegments: reservedCreditCount,
          source: 'campaign_send',
          sourceId,
          description: 'Campaign SMS reservation',
        })
      : [];

  const startResult = await startCampaignSend(input.db, {
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    reservedCreditCount: campaign.reservedCreditCount ?? reservedCreditCount,
  });

  if (startResult.status !== 'started') {
    throw new Error('Campaign send could not be started.');
  }

  let sentCount = 0;
  let skippedCount = 0;
  let actualCreditCount = 0;

  for (const prepared of preparedRecipients) {
    if (
      prepared.recipient.status !== 'sent' &&
      (await shouldSkipRecipient(input.db, prepared.recipient))
    ) {
      await markCampaignRecipientSkipped(input.db, {
        organizationId: input.organizationId,
        recipientId: prepared.recipient.id,
        exclusionReason: 'suppressed_phone',
      });
      skippedCount += 1;
      continue;
    }

    const messageResult = await createOutboundSmsMessage(input.db, {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      recipientId: prepared.recipient.id,
      contactId: prepared.recipient.contactId,
      provider: provider.name,
      fromPhone: sender.phoneNumber,
      toPhone: prepared.recipient.normalizedPhone as string,
      body: prepared.renderedBody,
      estimatedSegmentCount: prepared.estimatedSegments,
      currency: 'SEK',
    });
    const message = messageResult.message;

    if (message.providerMessageId) {
      await markCampaignRecipientSent(input.db, {
        organizationId: input.organizationId,
        recipientId: prepared.recipient.id,
      });
      sentCount += 1;
      actualCreditCount +=
        message.actualSegmentCount ?? message.estimatedSegmentCount;
      continue;
    }

    const providerResult = await provider.sendSms({
      retainoMessageId: message.id,
      organizationSender: sender,
      to: prepared.recipient.normalizedPhone as string,
      renderedBody: prepared.renderedBody,
      estimatedSegments: prepared.estimatedSegments,
      statusCallbackUrl: callbackUrl(
        input.env.TWILIO_STATUS_CALLBACK_BASE_URL,
        '/v1/webhooks/twilio/messaging/status',
      ),
      reference: `campaign:${input.campaignId}:recipient:${prepared.recipient.id}`,
    });
    const actualSegments =
      providerResult.actualSegments ?? prepared.estimatedSegments;

    await recordSmsMessageProviderResult(input.db, {
      organizationId: input.organizationId,
      messageId: message.id,
      providerMessageId: providerResult.providerMessageId,
      providerMessagingServiceId: sender.providerMessagingServiceId,
      providerPhoneNumberId: sender.providerPhoneNumberId,
      status: providerResult.normalizedStatus,
      actualSegmentCount: providerResult.actualSegments,
      actualCostMinor: providerCostMinor(providerResult.cost),
      currency: providerResult.currency,
    });
    await markCampaignRecipientSent(input.db, {
      organizationId: input.organizationId,
      recipientId: prepared.recipient.id,
    });

    sentCount += 1;
    actualCreditCount += actualSegments;
  }

  const completedCampaign = await markCampaignSendCompleted(input.db, {
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    actualCreditCount,
  });

  if (
    reservedCreditCount > actualCreditCount &&
    reservedTransactions.length > 0
  ) {
    await releaseSmsCreditUsage({
      db: input.db,
      organizationId: input.organizationId,
      credits: reservedCreditCount - actualCreditCount,
      reservedTransactions,
      source: 'campaign_send',
      sourceId: `${sourceId}:release`,
      description: 'Campaign SMS reservation release',
    });
  }

  await createAuditLog(input.db, {
    organizationId: input.organizationId,
    actorUserId: input.userId,
    eventType: 'campaign.sent',
    resourceType: 'campaign',
    resourceId: input.campaignId,
    metadata: {
      recipientCount: recipients.length,
      sentCount,
      skippedCount,
      reservedCreditCount,
      actualCreditCount,
    },
  });

  return {
    campaign: completedCampaign,
    sentCount,
    skippedCount,
    reservedCreditCount,
    actualCreditCount,
  };
}

async function prepareRecipients(input: {
  db: DbClient;
  campaign: Campaign;
  recipients: CampaignRecipientForSend[];
  trackingBaseUrl: string;
}): Promise<PreparedRecipient[]> {
  const prepared: PreparedRecipient[] = [];

  for (const recipient of input.recipients) {
    if (!recipient.normalizedPhone || !recipient.phoneHash) {
      await markCampaignRecipientSkipped(input.db, {
        organizationId: recipient.organizationId,
        recipientId: recipient.id,
        exclusionReason: 'missing_phone',
      });
      continue;
    }

    if (
      recipient.status !== 'sent' &&
      (await isPhoneSuppressed(input.db, recipient))
    ) {
      await markCampaignRecipientSkipped(input.db, {
        organizationId: recipient.organizationId,
        recipientId: recipient.id,
        exclusionReason: 'suppressed_phone',
      });
      continue;
    }

    const trackingLink = await upsertTrackingLink(input.db, {
      organizationId: recipient.organizationId,
      campaignId: recipient.campaignId,
      recipientId: recipient.id,
      code: trackingCode(),
      targetUrl: input.campaign.bookingUrl as string,
      phoneHash: recipient.phoneHash,
      emailHash: recipient.emailHash,
    });

    if (!trackingLink) {
      throw new Error('Tracking link was not created.');
    }

    const rendered = renderCampaignSms({
      smsBody: input.campaign.smsBody as string,
      trackedBookingLink: trackingUrl(input.trackingBaseUrl, trackingLink.code),
      recipient: {
        firstName: firstName(recipient.name),
        lastBookingDate: bookingDateLabel(recipient.lastBookingAt),
      },
    });

    prepared.push({
      recipient,
      renderedBody: rendered.renderedBody,
      estimatedSegments: rendered.estimatedSmsPerRecipient,
    });
  }

  return prepared;
}

async function shouldSkipRecipient(
  db: DbClient,
  recipient: CampaignRecipientForSend,
) {
  if (!recipient.normalizedPhone || !recipient.phoneHash) {
    return true;
  }

  return isPhoneSuppressed(db, recipient);
}

async function isPhoneSuppressed(
  db: DbClient,
  recipient: CampaignRecipientForSend,
) {
  if (!recipient.phoneHash) {
    return false;
  }

  return Boolean(
    await findSuppressionByHash(db, {
      organizationId: recipient.organizationId,
      type: 'phone',
      valueHash: recipient.phoneHash,
    }),
  );
}

function trackingCode() {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 16);
}

function trackingUrl(baseUrl: string, code: string) {
  return `${baseUrl.replace(/\/$/, '')}/r/${code}`;
}

function firstName(name: string | null) {
  return name?.trim().split(/\s+/)[0] ?? null;
}

function bookingDateLabel(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}
