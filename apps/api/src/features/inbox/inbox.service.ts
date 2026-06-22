import {
  createManualReplySmsMessage,
  findSuppressionByHash,
  getInboxConversationById,
  getInboxConversationPhoneIdentity,
  getInboxSummary,
  getOrganizationSmsSender,
  listInboxConversations,
  listInboxMessages,
  markManualReplyFailed,
  markInboxConversationRead,
  markInboxConversationUnread,
  recordSmsMessageProviderResult,
  type DbClient,
} from '@retaino/db';
import {
  estimateSmsMessage,
} from '@retaino/shared';
import type {
  InboxConversationActivityFilter,
  SendInboxReplyInput,
} from '@retaino/shared/contracts';
import {
  assertOrganizationCanSpendSmsCredits,
  debitSmsCreditUsage,
  releaseSmsCreditUsage,
} from '../billing/billing.service';
import { callbackUrl } from '../../lib/callback-url';
import { isSmsSenderReadyForSending } from '../../lib/sms-sender-readiness';
import { createSmsProvider, SmsProviderError } from '../../lib/sms-provider';
import { providerCostMinor } from '../../lib/sms-cost';
import { resolvedOutboundSmsSegments } from '../../lib/sms-segments';
import type { AppEnv } from '../../types';

export type SendInboxReplyResult =
  | { status: 'not_found' }
  | { status: 'reply_blocked' }
  | { status: 'sender_not_ready' }
  | {
      status: 'sent';
      response: Awaited<ReturnType<typeof sendInboxReplyResponse>>;
    };

export async function listInbox(input: {
  db: DbClient;
  organizationId: string;
  activity: InboxConversationActivityFilter;
}) {
  return listInboxConversations(input.db, {
    organizationId: input.organizationId,
    activity: input.activity,
  });
}

export async function getInboxConversation(input: {
  db: DbClient;
  organizationId: string;
  conversationId: string;
}) {
  const conversation = await getInboxConversationById(input.db, {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
  });

  if (!conversation) {
    return null;
  }

  const { messages } = await listInboxMessages(input.db, {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
  });

  return { conversation, messages };
}

export async function getInboxUnreadSummary(input: {
  db: DbClient;
  organizationId: string;
}) {
  return getInboxSummary(input.db, input);
}

export async function markConversationRead(input: {
  db: DbClient;
  organizationId: string;
  conversationId: string;
}) {
  const conversation = await markInboxConversationRead(input.db, {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
  });

  return conversation ? { conversation } : null;
}

export async function markConversationUnread(input: {
  db: DbClient;
  organizationId: string;
  conversationId: string;
}) {
  const conversation = await markInboxConversationUnread(input.db, {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
  });

  return conversation ? { conversation } : null;
}

export async function sendInboxReply(input: {
  db: DbClient;
  env: AppEnv['Bindings'];
  organizationId: string;
  actorUserId: string;
  conversationId: string;
  reply: SendInboxReplyInput;
}): Promise<SendInboxReplyResult> {
  const conversation = await getInboxConversationById(input.db, {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
  });

  if (!conversation) {
    return { status: 'not_found' };
  }

  const phoneIdentity = await conversationPhoneIdentity(input.db, input);

  if (
    conversation.replyBlocked ||
    (await findSuppressionByHash(input.db, {
      organizationId: input.organizationId,
      type: 'phone',
      valueHash: phoneIdentity.phoneHash,
    }))
  ) {
    return { status: 'reply_blocked' };
  }

  const provider = createSmsProvider(input.env);
  const sender = await getOrganizationSmsSender(input.db, {
    organizationId: input.organizationId,
    provider: provider.name,
  });

  if (!isSmsSenderReadyForSending(sender)) {
    return { status: 'sender_not_ready' };
  }

  const estimate = estimateSmsMessage(input.reply.body);
  await assertOrganizationCanSpendSmsCredits({
    db: input.db,
    organizationId: input.organizationId,
    estimatedSegments: estimate.segments,
  });

  const idempotencyKey =
    `manual-reply:${input.conversationId}:${input.reply.clientRequestId}`;
  const reservedTransactions = await debitSmsCreditUsage({
    db: input.db,
    organizationId: input.organizationId,
    actualSegments: estimate.segments,
    source: 'manual_reply',
    sourceId: idempotencyKey,
    description: 'Inbox SMS reply usage',
  });
  let created:
    | Awaited<ReturnType<typeof createManualReplySmsMessage>>
    | null = null;
  let providerAccepted = false;

  try {
    created = await createManualReplySmsMessage(input.db, {
      conversationId: input.conversationId,
      organizationId: input.organizationId,
      contactId: conversation.contactId,
      createdByUserId: input.actorUserId,
      provider: provider.name,
      fromPhone: sender.phoneNumber,
      toPhone: phoneIdentity.normalizedPhone,
      normalizedPhone: phoneIdentity.normalizedPhone,
      phoneHash: phoneIdentity.phoneHash,
      body: input.reply.body,
      estimatedSegmentCount: estimate.segments,
      currency: 'SEK',
      idempotencyKey,
    });

    if (created.status === 'existing') {
      if (created.message.status === 'failed') {
        throw new SmsProviderError({
          code: 'provider_permanent_failure',
          retryable: false,
          publicMessage: 'The SMS provider rejected the message.',
        });
      }

      return {
        status: 'sent',
        response: await sendInboxReplyResponse(input.db, input, created.message),
      };
    }

    const providerResult = await provider.sendSms({
      retainoMessageId: created.message.id,
      organizationSender: sender,
      to: phoneIdentity.normalizedPhone,
      renderedBody: input.reply.body,
      estimatedSegments: estimate.segments,
      statusCallbackUrl: callbackUrl(
        input.env.TWILIO_STATUS_CALLBACK_BASE_URL,
        '/v1/webhooks/twilio/messaging/status',
      ),
      reference: idempotencyKey,
    });
    providerAccepted = true;

    await recordSmsMessageProviderResult(input.db, {
      organizationId: input.organizationId,
      messageId: created.message.id,
      providerMessageId: providerResult.providerMessageId,
      providerMessagingServiceId: sender.providerMessagingServiceId,
      providerPhoneNumberId: sender.providerPhoneNumberId,
      status: providerResult.normalizedStatus,
      actualSegmentCount: resolvedOutboundSmsSegments({
        estimatedSegments: estimate.segments,
        providerSegments: providerResult.actualSegments,
      }),
      actualCostMinor: providerCostMinor(providerResult.cost),
      currency: providerResult.currency,
    });
  } catch (error) {
    if (!providerAccepted && created?.status === 'created') {
      await markManualReplyFailed(input.db, {
        organizationId: input.organizationId,
        messageId: created.message.id,
      });
    }

    if (!providerAccepted) {
      await releaseSmsCreditUsage({
        db: input.db,
        organizationId: input.organizationId,
        reservedTransactions,
        source: 'manual_reply',
        sourceId: `${idempotencyKey}:release`,
        description: 'Inbox SMS reply release',
      });
    }

    throw error;
  }

  return {
    status: 'sent',
    response: await sendInboxReplyResponse(input.db, input, created.message),
  };
}

async function sendInboxReplyResponse(
  db: DbClient,
  input: {
    organizationId: string;
    conversationId: string;
  },
  message: Awaited<ReturnType<typeof createManualReplySmsMessage>>['message'],
) {
  const conversation = await getInboxConversationById(db, input);

  if (!conversation) {
    throw new Error('Inbox conversation was not found after reply send.');
  }

  return {
    conversation,
    message,
  };
}

async function conversationPhoneIdentity(
  db: DbClient,
  input: { organizationId: string; conversationId: string },
) {
  const row = await getInboxConversationPhoneIdentity(db, input);

  if (!row?.phoneHash) {
    throw new Error('Inbox conversation phone identity was not found.');
  }

  return row;
}
