import {
  auditEvents,
  countCampaignRecipients,
  createOutboundSmsMessage,
  findCampaignSendExclusionForRecipient,
  findSuppressionByHash,
  getCampaignById,
  getCampaignTestSmsContact,
  getCurrentLegalBundle,
  getCurrentOrganizationLegalAcceptance,
  getOrganizationProfileByOrganizationId,
  getOrganizationSmsSender,
  launchCampaign,
  listSelectedCampaignRecipientsForSend,
  markCampaignRecipientSent,
  markCampaignRecipientSkipped,
  markCampaignSendCompleted,
  markCampaignSendFailed,
  recordAuditLog,
  recordSmsMessageProviderResult,
  startCampaignSend,
  upsertTrackingLink,
  type CampaignRecipientForSend,
  type DbClient,
} from '@retaino/db';
import { renderCampaignSms, TRACKING_CODE_LENGTH } from '@retaino/shared';
import {
  normalizePhoneNumber,
  requiresRecentCampaignExclusionAcknowledgement,
} from '@retaino/shared/contracts';
import type { Campaign, SmsCreditTransaction } from '@retaino/shared/contracts';
import {
  debitSmsCreditUsage,
  releaseSmsCreditUsage,
} from '../billing/billing.service';
import { callbackUrl } from '../../lib/callback-url';
import { captureBackgroundError } from '../../lib/sentry';
import { isSmsSenderReadyForSending } from '../../lib/sms-sender-readiness';
import { createSmsProvider } from '../../lib/sms-provider';
import { providerCostMinor } from '../../lib/sms-cost';
import { resolvedOutboundSmsSegments } from '../../lib/sms-segments';
import type { AppEnv } from '../../types';

type CampaignSendResult = {
  campaign: Campaign | null;
  sentCount: number;
  skippedCount: number;
  reservedCreditCount: number;
  actualCreditCount: number;
};

type CampaignTestSmsResult =
  | { status: 'not_found' }
  | { status: 'incomplete' }
  | { status: 'invalid_phone' }
  | { status: 'invalid_sample_contact' }
  | { status: 'sender_not_ready' }
  | {
      status: 'sent';
      testSend: {
        to: string;
        renderedBody: string;
        estimatedSmsPerRecipient: number;
        chargedCredits: number;
        status: string;
      };
    };

type QueueCampaignSendResult =
  | { status: 'not_found' }
  | { status: 'not_sendable' }
  | { status: 'sender_not_ready' }
  | { status: 'incomplete' }
  | { status: 'empty_audience' }
  | { status: 'recent_campaign_exclusion_acknowledgement_required' }
  | {
      status: 'queued';
      campaign: Campaign;
      recipientCount: number;
    };

type PreparedRecipient = {
  recipient: CampaignRecipientForSend;
  renderedBody: string;
  estimatedSegments: number;
};

export const TEST_TRACKED_BOOKING_LINK = 'https://go.retaino.io/r/test';
const TRACKING_CODE_ESTIMATE = '0'.repeat(TRACKING_CODE_LENGTH);

type CampaignSendCreditReservation = {
  reservedCreditCount: number;
  reservedTransactions: SmsCreditTransaction[];
  sourceId: string;
};

export async function queueCampaignSend(input: {
  db: DbClient;
  env: AppEnv['Bindings'];
  organizationId: string;
  campaignId: string;
  userId: string;
  userAgent: string | null;
  recentCampaignExclusionAcknowledged?: boolean | undefined;
  enqueue: (payload: {
    organizationId: string;
    campaignId: string;
    userId: string;
  }) => Promise<void>;
}): Promise<QueueCampaignSendResult> {
  const campaign = await getCampaignById(input.db, {
    organizationId: input.organizationId,
    campaignId: input.campaignId,
  });

  if (!campaign) {
    return { status: 'not_found' };
  }

  if (campaign.status !== 'draft' && campaign.status !== 'ready_to_send') {
    return { status: 'not_sendable' };
  }

  if (
    requiresRecentCampaignExclusionAcknowledgement(campaign.audienceRule) &&
    !input.recentCampaignExclusionAcknowledged
  ) {
    return { status: 'recent_campaign_exclusion_acknowledgement_required' };
  }

  const provider = createSmsProvider(input.env);
  const sender = await getOrganizationSmsSender(input.db, {
    organizationId: input.organizationId,
    provider: provider.name,
  });

  if (!isSmsSenderReadyForSending(sender)) {
    return { status: 'sender_not_ready' };
  }

  let sendCampaign = campaign;
  let recipientCount = 0;
  if (campaign.status === 'draft') {
    const result = await launchCampaign(input.db, {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      actorUserId: input.userId,
      recentCampaignExclusionAcknowledged:
        input.recentCampaignExclusionAcknowledged ?? false,
      userAgent: input.userAgent,
    });

    if (result.status === 'not_found') {
      return { status: 'not_found' };
    }

    if (result.status === 'not_editable') {
      return { status: 'not_sendable' };
    }

    if (result.status === 'incomplete') {
      return { status: 'incomplete' };
    }

    if (result.status === 'empty_audience') {
      return { status: 'empty_audience' };
    }

    sendCampaign = result.campaign;
    recipientCount = result.recipientCount;
  } else {
    const summary = await countCampaignRecipients(input.db, {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
    });
    recipientCount = summary.recipientCount;
  }

  const reservation = await reserveCampaignSendCredits({
    db: input.db,
    organizationId: input.organizationId,
    campaign: sendCampaign,
    trackingBaseUrl: input.env.TRACKING_BASE_URL,
  });

  try {
    await input.enqueue({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      userId: input.userId,
    });
  } catch (error) {
    await releaseUnusedCampaignCredits({
      db: input.db,
      organizationId: input.organizationId,
      reservedCreditCount: reservation.reservedCreditCount,
      actualCreditCount: 0,
      reservedTransactions: reservation.reservedTransactions,
      reservationSourceId: reservation.sourceId,
    });

    throw error;
  }

  return {
    status: 'queued',
    campaign: sendCampaign,
    recipientCount,
  };
}

export async function sendCampaignTestSms(input: {
  db: DbClient;
  env: AppEnv['Bindings'];
  organizationId: string;
  campaignId: string;
  sampleContactId?: string | undefined;
  testPhone?: string | undefined;
  testPhoneCountryCode?: string | undefined;
}): Promise<CampaignTestSmsResult> {
  const [campaign, profile] = await Promise.all([
    getCampaignById(input.db, {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
    }),
    getOrganizationProfileByOrganizationId(input.db, input.organizationId),
  ]);

  if (!campaign) {
    return { status: 'not_found' };
  }

  if (!campaign.smsBody || !campaign.bookingUrl) {
    return { status: 'incomplete' };
  }

  const phone = input.testPhone ?? profile?.responsiblePhone;
  const phoneCountryCode = input.testPhone
    ? (input.testPhoneCountryCode ?? profile?.countryCode ?? 'SE')
    : (profile?.countryCode ?? 'SE');
  const normalizedPhone = normalizePhoneNumber(
    phone,
    phoneCountryCode,
  );

  if (!normalizedPhone.ok) {
    return { status: 'invalid_phone' };
  }

  const sampleContact = input.sampleContactId
    ? await getCampaignTestSmsContact(input.db, {
        organizationId: input.organizationId,
        audienceRule: campaign.audienceRule,
        contactId: input.sampleContactId,
      })
    : null;

  if (input.sampleContactId && !sampleContact) {
    return { status: 'invalid_sample_contact' };
  }

  const rendered = renderCampaignSms({
    smsBody: campaign.smsBody,
    trackedBookingLink: TEST_TRACKED_BOOKING_LINK,
    ...(sampleContact
      ? {
          recipient: {
            firstName: firstName(sampleContact.name),
            lastBookingDate: bookingDateLabel(sampleContact.lastBookingAt),
          },
        }
      : {}),
  });
  const messageId = crypto.randomUUID();
  const sourceId = `campaign-test:${campaign.id}:${messageId}`;
  const provider = createSmsProvider(input.env);
  const sender = await getOrganizationSmsSender(input.db, {
    organizationId: input.organizationId,
    provider: provider.name,
  });

  if (!isSmsSenderReadyForSending(sender)) {
    return { status: 'sender_not_ready' };
  }

  const reservedTransactions = await debitSmsCreditUsage({
    db: input.db,
    organizationId: input.organizationId,
    actualSegments: rendered.estimatedSmsPerRecipient,
    source: 'campaign_test_send',
    sourceId,
    description: 'Campaign test SMS usage',
  });
  let result;

  try {
    result = await provider.sendSms({
      retainoMessageId: messageId,
      organizationSender: sender,
      to: normalizedPhone.normalizedPhone,
      renderedBody: rendered.renderedBody,
      estimatedSegments: rendered.estimatedSmsPerRecipient,
      statusCallbackUrl: callbackUrl(
        input.env.TWILIO_STATUS_CALLBACK_BASE_URL,
        '/v1/webhooks/twilio/messaging/status',
      ),
      reference: sourceId,
    });
  } catch (error) {
    await releaseSmsCreditUsage({
      db: input.db,
      organizationId: input.organizationId,
      reservedTransactions,
      source: 'campaign_test_send',
      sourceId: `${sourceId}:release`,
      description: 'Campaign test SMS release',
    });

    throw error;
  }

  return {
    status: 'sent',
    testSend: {
      to: normalizedPhone.normalizedPhone,
      renderedBody: rendered.renderedBody,
      estimatedSmsPerRecipient: rendered.estimatedSmsPerRecipient,
      chargedCredits: rendered.estimatedSmsPerRecipient,
      status: result.normalizedStatus,
    },
  };
}

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

  if (!isSmsSenderReadyForSending(sender)) {
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
  const estimatedCreditCount = preparedRecipients.reduce(
    (sum, prepared) => sum + prepared.estimatedSegments,
    0,
  );
  const requestedReservedCreditCount =
    campaign.reservedCreditCount ?? estimatedCreditCount;
  const reservation = await debitCampaignSendCredits({
    db: input.db,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    reservedCreditCount: requestedReservedCreditCount,
  });
  const reservedCreditCount = reservation.reservedCreditCount;
  const reservedTransactions = reservation.reservedTransactions;

  const startResult = await startCampaignSend(input.db, {
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    reservedCreditCount,
  });

  if (startResult.status !== 'started') {
    if (
      startResult.status !== 'active_send_exists' &&
      reservedTransactions.length > 0
    ) {
      await releaseUnusedCampaignCredits({
        db: input.db,
        organizationId: input.organizationId,
        reservedCreditCount,
        actualCreditCount: 0,
        reservedTransactions,
        reservationSourceId: reservation.sourceId,
      });
    }

    throw new Error(
      startResult.status === 'active_send_exists'
        ? 'Another campaign send is already active.'
        : 'Campaign send could not be started.',
    );
  }

  let sentCount = 0;
  let skippedCount = 0;
  let actualCreditCount = 0;

  try {
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
        normalizedPhone: prepared.recipient.normalizedPhone as string,
        phoneHash: prepared.recipient.phoneHash as string,
        idempotencyKey:
          `campaign-send:${input.campaignId}:recipient:${prepared.recipient.id}`,
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

      if (messageResult.status === 'existing') {
        throw new Error('Campaign recipient send attempt is unresolved.');
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
      const actualSegments = resolvedOutboundSmsSegments({
        estimatedSegments: prepared.estimatedSegments,
        providerSegments: providerResult.actualSegments,
      });

      await recordSmsMessageProviderResult(input.db, {
        organizationId: input.organizationId,
        messageId: message.id,
        providerMessageId: providerResult.providerMessageId,
        providerMessagingServiceId: sender.providerMessagingServiceId,
        providerPhoneNumberId: sender.providerPhoneNumberId,
        status: providerResult.normalizedStatus,
        actualSegmentCount: actualSegments,
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
  } catch (error) {
    const failureReason = errorMessage(error);

    captureBackgroundError(error, {
      feature: 'campaigns',
      operation: 'process_send',
      organizationId: input.organizationId,
      campaignId: input.campaignId,
    });

    await releaseUnusedCampaignCredits({
      db: input.db,
      organizationId: input.organizationId,
      reservedCreditCount,
      actualCreditCount,
      reservedTransactions,
      reservationSourceId: reservation.sourceId,
    });

    await markCampaignSendFailed(input.db, {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      actualCreditCount,
      failureReason,
    });

    await recordAuditLog(
      input.db,
      auditEvents.campaignFailed({
        organizationId: input.organizationId,
        actorUserId: input.userId,
        campaignId: input.campaignId,
        recipientCount: recipients.length,
        sentCount,
        skippedCount,
        reservedCreditCount,
        actualCreditCount,
        failureReason,
      }),
    );

    throw error;
  }

  await releaseUnusedCampaignCredits({
    db: input.db,
    organizationId: input.organizationId,
    reservedCreditCount,
    actualCreditCount,
    reservedTransactions,
    reservationSourceId: reservation.sourceId,
  });

  await recordAuditLog(
    input.db,
    auditEvents.campaignSent({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      campaignId: input.campaignId,
      recipientCount: recipients.length,
      sentCount,
      skippedCount,
      reservedCreditCount,
      actualCreditCount,
    }),
  );

  const completedCampaign = await markCampaignSendCompleted(input.db, {
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    actualCreditCount,
  });

  return {
    campaign: completedCampaign,
    sentCount,
    skippedCount,
    reservedCreditCount,
    actualCreditCount,
  };
}

export async function reserveCampaignSendCredits(input: {
  db: DbClient;
  organizationId: string;
  campaign: Campaign;
  trackingBaseUrl: string | undefined;
}): Promise<CampaignSendCreditReservation> {
  if (!input.trackingBaseUrl) {
    throw new Error('Campaign send processing is missing TRACKING_BASE_URL.');
  }

  if (!input.campaign.smsBody || !input.campaign.bookingUrl) {
    throw new Error('Campaign message and booking link are required.');
  }

  const { recipients } = await listSelectedCampaignRecipientsForSend(input.db, {
    organizationId: input.organizationId,
    campaignId: input.campaign.id,
  });
  let estimatedCreditCount = 0;

  for (const recipient of recipients) {
    if (!recipient.normalizedPhone || !recipient.phoneHash) {
      continue;
    }

    if (await isPhoneSuppressed(input.db, recipient)) {
      continue;
    }

    if (await findCampaignExclusion(input.db, input.campaign, recipient)) {
      continue;
    }

    const rendered = renderCampaignSms({
      smsBody: input.campaign.smsBody,
      trackedBookingLink: trackingUrl(
        input.trackingBaseUrl,
        TRACKING_CODE_ESTIMATE,
      ),
      recipient: {
        firstName: firstName(recipient.name),
        lastBookingDate: bookingDateLabel(recipient.lastBookingAt),
      },
    });

    estimatedCreditCount += rendered.estimatedSmsPerRecipient;
  }

  return debitCampaignSendCredits({
    db: input.db,
    organizationId: input.organizationId,
    campaignId: input.campaign.id,
    reservedCreditCount: estimatedCreditCount,
  });
}

async function debitCampaignSendCredits(input: {
  db: DbClient;
  organizationId: string;
  campaignId: string;
  reservedCreditCount: number;
}): Promise<CampaignSendCreditReservation> {
  const sourceId = `campaign-send:${input.campaignId}`;
  const reservedTransactions =
    input.reservedCreditCount > 0
      ? await debitSmsCreditUsage({
          db: input.db,
          organizationId: input.organizationId,
          actualSegments: input.reservedCreditCount,
          source: 'campaign_send',
          sourceId,
          description: 'Campaign SMS reservation',
        })
      : [];
  const debitedCreditCount = reservedTransactions.reduce(
    (total, transaction) =>
      transaction.credits < 0 ? total + Math.abs(transaction.credits) : total,
    0,
  );
  const reservationSourceId =
    reservedTransactions.find((transaction) => transaction.credits < 0)
      ?.sourceId ?? sourceId;

  return {
    reservedCreditCount: debitedCreditCount || input.reservedCreditCount,
    reservedTransactions,
    sourceId: reservationSourceId,
  };
}

async function releaseUnusedCampaignCredits(input: {
  db: DbClient;
  organizationId: string;
  reservedCreditCount: number;
  actualCreditCount: number;
  reservedTransactions: SmsCreditTransaction[];
  reservationSourceId: string;
}) {
  const unusedCreditCount =
    input.reservedCreditCount - input.actualCreditCount;

  if (unusedCreditCount <= 0 || input.reservedTransactions.length === 0) {
    return;
  }

  await releaseSmsCreditUsage({
    db: input.db,
    organizationId: input.organizationId,
    credits: unusedCreditCount,
    reservedTransactions: input.reservedTransactions,
    source: 'campaign_send',
    sourceId: `${input.reservationSourceId}:release`,
    description: 'Campaign SMS reservation release',
  });
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Campaign send failed.';
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

    if (recipient.status !== 'sent') {
      const exclusionReason = await findCampaignExclusion(
        input.db,
        input.campaign,
        recipient,
      );

      if (exclusionReason) {
        await markCampaignRecipientSkipped(input.db, {
          organizationId: recipient.organizationId,
          recipientId: recipient.id,
          exclusionReason,
        });
        continue;
      }
    }

    const trackingLink = await upsertTrackingLink(input.db, {
      organizationId: recipient.organizationId,
      campaignId: recipient.campaignId,
      recipientId: recipient.id,
      code: trackingCode(),
      targetUrl: input.campaign.bookingUrl as string,
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

async function findCampaignExclusion(
  db: DbClient,
  campaign: Campaign,
  recipient: CampaignRecipientForSend,
) {
  return findCampaignSendExclusionForRecipient(db, {
    organizationId: recipient.organizationId,
    currentCampaignId: campaign.id,
    contactId: recipient.contactId,
    phoneHash: recipient.phoneHash,
    audienceRule: campaign.audienceRule,
  });
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
  return crypto.randomUUID().replaceAll('-', '').slice(0, TRACKING_CODE_LENGTH);
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
