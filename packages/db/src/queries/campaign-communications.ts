import {
  and,
  eq,
  sql,
} from 'drizzle-orm';
import type {
  SmsMessageDirection,
  SmsSenderProvider,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import {
  campaignMessageEvents,
  clickEvents,
  smsMessages,
  trackingLinks,
} from '../schema';
import { assertOrganizationId } from './contacts';
import { upsertSmsConversationForMessage } from './inbox';

type SmsMessageRow = typeof smsMessages.$inferSelect;
type TrackingLinkRow = typeof trackingLinks.$inferSelect;
type CampaignMessageEventRow = typeof campaignMessageEvents.$inferSelect;
type ClickEventRow = typeof clickEvents.$inferSelect;

function trackingLinkToContract(row: TrackingLinkRow) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    campaignId: row.campaignId,
    recipientId: row.recipientId,
    code: row.code,
    targetUrl: row.targetUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function smsMessageToContract(row: SmsMessageRow) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    direction: row.direction as SmsMessageDirection,
    campaignId: row.campaignId,
    recipientId: row.recipientId,
    contactId: row.contactId,
    provider: row.provider as SmsSenderProvider,
    providerMessageId: row.providerMessageId,
    providerMessagingServiceId: row.providerMessagingServiceId,
    providerPhoneNumberId: row.providerPhoneNumberId,
    fromPhone: row.fromPhone,
    toPhone: row.toPhone,
    normalizedPhone: row.normalizedPhone,
    phoneHash: row.phoneHash,
    idempotencyKey: row.idempotencyKey,
    body: row.body,
    status: row.status,
    estimatedSegmentCount: row.estimatedSegmentCount,
    actualSegmentCount: row.actualSegmentCount,
    estimatedCostMinor: row.estimatedCostMinor,
    actualCostMinor: row.actualCostMinor,
    currency: row.currency,
    queuedAt: row.queuedAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    receivedAt: row.receivedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function campaignMessageEventToContract(row: CampaignMessageEventRow) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    campaignId: row.campaignId,
    messageId: row.messageId,
    recipientId: row.recipientId,
    provider: row.provider as SmsSenderProvider,
    providerMessageId: row.providerMessageId,
    eventType: row.eventType,
    rawStatus: row.rawStatus,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function clickEventToContract(row: ClickEventRow) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    campaignId: row.campaignId,
    recipientId: row.recipientId,
    trackingLinkId: row.trackingLinkId,
    userAgent: row.userAgent,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

type SmsMessage = ReturnType<typeof smsMessageToContract>;
type TrackingLink = ReturnType<typeof trackingLinkToContract>;

export async function upsertTrackingLink(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string;
    recipientId: string;
    code: string;
    targetUrl: string;
  },
) {
  assertOrganizationId(input.organizationId);
  const now = new Date();
  const [row] = await db
    .insert(trackingLinks)
    .values({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      recipientId: input.recipientId,
      code: input.code,
      targetUrl: input.targetUrl,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [trackingLinks.organizationId, trackingLinks.recipientId],
      set: {
        targetUrl: input.targetUrl,
        updatedAt: now,
      },
    })
    .returning();

  return row ? trackingLinkToContract(row) : null;
}

export async function getTrackingLinkByCode(db: DbClient, code: string) {
  const [row] = await db
    .select()
    .from(trackingLinks)
    .where(eq(trackingLinks.code, code))
    .limit(1);

  return row ? trackingLinkToContract(row) : null;
}

export async function recordTrackingClick(
  db: DbClient,
  input: {
    trackingLink: TrackingLink;
    userAgent: string | null;
    now?: Date;
  },
) {
  assertOrganizationId(input.trackingLink.organizationId);
  const now = input.now ?? new Date();
  const [row] = await db
    .insert(clickEvents)
    .values({
      organizationId: input.trackingLink.organizationId,
      campaignId: input.trackingLink.campaignId,
      recipientId: input.trackingLink.recipientId,
      trackingLinkId: input.trackingLink.id,
      userAgent: input.userAgent,
      occurredAt: now,
    })
    .returning();

  return row ? clickEventToContract(row) : null;
}

export async function createOutboundSmsMessage(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string;
    recipientId: string;
    contactId: string | null;
    provider: SmsSenderProvider;
    fromPhone: string | null;
    toPhone: string;
    normalizedPhone: string;
    phoneHash: string;
    idempotencyKey: string;
    body: string;
    estimatedSegmentCount: number;
    currency: string | null;
    now?: Date;
  },
): Promise<
  | { status: 'created'; message: SmsMessage }
  | { status: 'existing'; message: SmsMessage }
> {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const [created] = await db
    .insert(smsMessages)
    .values({
      organizationId: input.organizationId,
      direction: 'outbound',
      campaignId: input.campaignId,
      recipientId: input.recipientId,
      contactId: input.contactId,
      provider: input.provider,
      fromPhone: input.fromPhone,
      toPhone: input.toPhone,
      normalizedPhone: input.normalizedPhone,
      phoneHash: input.phoneHash,
      idempotencyKey: input.idempotencyKey,
      body: input.body,
      status: 'queued',
      estimatedSegmentCount: input.estimatedSegmentCount,
      currency: input.currency,
      queuedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [
        smsMessages.organizationId,
        smsMessages.idempotencyKey,
      ],
    })
    .returning();

  if (created) {
    await upsertSmsConversationForMessage(db, {
      organizationId: input.organizationId,
      phoneHash: input.phoneHash,
      normalizedPhone: input.normalizedPhone,
      now,
    });

    return { status: 'created', message: smsMessageToContract(created) };
  }

  const [existing] = await db
    .select()
    .from(smsMessages)
    .where(
      and(
        eq(smsMessages.organizationId, input.organizationId),
        eq(smsMessages.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error('Outbound SMS message was not created or found.');
  }

  await upsertSmsConversationForMessage(db, {
    organizationId: input.organizationId,
    phoneHash: input.phoneHash,
    normalizedPhone: input.normalizedPhone,
    now,
  });

  return { status: 'existing', message: smsMessageToContract(existing) };
}

export async function getSmsMessageByProviderMessageId(
  db: DbClient,
  input: { provider: SmsSenderProvider; providerMessageId: string },
) {
  const [row] = await db
    .select()
    .from(smsMessages)
    .where(
      and(
        eq(smsMessages.provider, input.provider),
        eq(smsMessages.providerMessageId, input.providerMessageId),
      ),
    )
    .limit(1);

  return row ? smsMessageToContract(row) : null;
}

export async function createInboundSmsMessage(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string | null;
    recipientId: string | null;
    contactId: string | null;
    provider: SmsSenderProvider;
    providerMessageId: string;
    providerMessagingServiceId: string | null;
    providerPhoneNumberId: string | null;
    fromPhone: string;
    toPhone: string;
    normalizedPhone: string;
    phoneHash: string;
    body: string;
    receivedAt: Date;
  },
) {
  assertOrganizationId(input.organizationId);
  const now = new Date();
  const [row] = await db
    .insert(smsMessages)
    .values({
      organizationId: input.organizationId,
      direction: 'inbound',
      campaignId: input.campaignId,
      recipientId: input.recipientId,
      contactId: input.contactId,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      providerMessagingServiceId: input.providerMessagingServiceId,
      providerPhoneNumberId: input.providerPhoneNumberId,
      fromPhone: input.fromPhone,
      toPhone: input.toPhone,
      normalizedPhone: input.normalizedPhone,
      phoneHash: input.phoneHash,
      body: input.body,
      status: 'received',
      estimatedSegmentCount: 0,
      actualSegmentCount: null,
      currency: null,
      receivedAt: input.receivedAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [smsMessages.provider, smsMessages.providerMessageId],
    })
    .returning();

  if (row) {
    await upsertSmsConversationForMessage(db, {
      organizationId: input.organizationId,
      phoneHash: input.phoneHash,
      normalizedPhone: input.normalizedPhone,
      now,
    });

    return smsMessageToContract(row);
  }

  const existing = await getSmsMessageByProviderMessageId(db, {
    provider: input.provider,
    providerMessageId: input.providerMessageId,
  });

  await upsertSmsConversationForMessage(db, {
    organizationId: input.organizationId,
    phoneHash: input.phoneHash,
    normalizedPhone: input.normalizedPhone,
    now,
  });

  return existing;
}

export async function recordCampaignMessageEvent(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string | null;
    messageId: string | null;
    recipientId: string | null;
    provider: SmsSenderProvider;
    providerMessageId: string;
    eventType: string;
    rawStatus: string | null;
    rawPayload: Record<string, unknown>;
    occurredAt: Date;
  },
) {
  assertOrganizationId(input.organizationId);
  const [row] = await db
    .insert(campaignMessageEvents)
    .values({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      messageId: input.messageId,
      recipientId: input.recipientId,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      eventType: input.eventType,
      rawStatus: input.rawStatus,
      rawPayload: input.rawPayload,
      occurredAt: input.occurredAt,
    })
    .onConflictDoNothing({
      target: [
        campaignMessageEvents.provider,
        campaignMessageEvents.providerMessageId,
        campaignMessageEvents.eventType,
      ],
    })
    .returning();

  return row ? campaignMessageEventToContract(row) : null;
}

export async function recordSmsMessageProviderResult(
  db: DbClient,
  input: {
    organizationId: string;
    messageId: string;
    providerMessageId: string;
    providerMessagingServiceId: string | null;
    providerPhoneNumberId: string | null;
    status: string;
    actualSegmentCount: number | null;
    actualCostMinor: number | null;
    currency: string | null;
    now?: Date;
  },
) {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const [row] = await db
    .update(smsMessages)
    .set({
      providerMessageId: input.providerMessageId,
      providerMessagingServiceId: input.providerMessagingServiceId,
      providerPhoneNumberId: input.providerPhoneNumberId,
      status: input.status,
      actualSegmentCount:
        input.actualSegmentCount ?? sql`${smsMessages.actualSegmentCount}`,
      actualCostMinor: input.actualCostMinor ?? sql`${smsMessages.actualCostMinor}`,
      currency: input.currency ?? sql`${smsMessages.currency}`,
      sentAt:
        input.status === 'sent' ||
        input.status === 'delivered' ||
        input.status === 'accepted'
          ? now
          : undefined,
      deliveredAt: input.status === 'delivered' ? now : undefined,
      failedAt:
        input.status === 'failed' || input.status === 'undelivered'
          ? now
          : undefined,
      updatedAt: now,
    })
    .where(
      and(
        eq(smsMessages.organizationId, input.organizationId),
        eq(smsMessages.id, input.messageId),
      ),
    )
    .returning();

  return row ? smsMessageToContract(row) : null;
}
