import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  not,
  or,
  type SQL,
} from 'drizzle-orm';
import type {
  Campaign,
  CampaignAudienceRule,
  CampaignAudiencePreviewResponse,
  CampaignRecipient,
  CampaignRecipientStatus,
  CampaignStatus,
  CreateCampaignDraftInput,
  SmsMessage,
  SmsMessageDirection,
  SmsSenderProvider,
  TrackingLink,
  UpdateCampaignDraftInput,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import {
  auditLogs,
  campaignRecipients,
  campaigns,
  contacts,
  smsMessages,
  trackingLinks,
} from '../schema';
import { assertOrganizationId, phoneSuppressionExistsFilter } from './contacts';

type CampaignRow = typeof campaigns.$inferSelect;
type CampaignRecipientRow = typeof campaignRecipients.$inferSelect;
type CampaignRecipientInsert = typeof campaignRecipients.$inferInsert;
type SmsMessageRow = typeof smsMessages.$inferSelect;
type TrackingLinkRow = typeof trackingLinks.$inferSelect;

const RECIPIENT_SNAPSHOT_INSERT_BATCH_SIZE = 1000;

export type UpdateCampaignDraftResult =
  | { status: 'updated'; campaign: Campaign }
  | { status: 'not_found' }
  | { status: 'not_editable' };

export type LaunchCampaignResult =
  | { status: 'launched'; campaign: Campaign; recipientCount: number }
  | { status: 'not_found' }
  | { status: 'not_editable' }
  | { status: 'incomplete' }
  | { status: 'empty_audience' };

export type StartCampaignSendResult =
  | { status: 'started'; campaign: Campaign }
  | { status: 'not_found' }
  | { status: 'not_ready' }
  | { status: 'active_send_exists' };

export type CampaignRecipientForSend = {
  id: string;
  organizationId: string;
  campaignId: string;
  contactId: string | null;
  status: CampaignRecipientStatus;
  exclusionReason: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
  phoneHash: string | null;
  emailHash: string | null;
  lastBookingAt: string | null;
  lastContactedAt: string | null;
  selectedAt: string | null;
};

export function campaignToContract(row: CampaignRow): Campaign {
  return {
    id: row.id,
    organizationId: row.organizationId,
    createdByUserId: row.createdByUserId,
    name: row.name,
    status: row.status as CampaignStatus,
    audienceRule: row.audienceRule as CampaignAudienceRule,
    smsBody: row.smsBody,
    bookingUrl: row.bookingUrl,
    campaignCode: row.campaignCode,
    attributionWindowDays: row.attributionWindowDays,
    readyToSendAt: row.readyToSendAt?.toISOString() ?? null,
    readyToSendByUserId: row.readyToSendByUserId,
    sendStartedAt: row.sendStartedAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    failureReason: row.failureReason,
    reservedCreditCount: row.reservedCreditCount,
    actualCreditCount: row.actualCreditCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function recipientToContract(row: CampaignRecipientRow): CampaignRecipient {
  return {
    id: row.id,
    organizationId: row.organizationId,
    campaignId: row.campaignId,
    contactId: row.contactId,
    status: row.status as CampaignRecipientStatus,
    exclusionReason: row.exclusionReason,
    name: row.name,
    phone: row.phone,
    email: row.email,
    lastBookingAt: row.lastBookingAt?.toISOString() ?? null,
    lastContactedAt: row.lastContactedAt?.toISOString() ?? null,
    selectedAt: row.selectedAt?.toISOString() ?? null,
    queuedAt: row.queuedAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function trackingLinkToContract(row: TrackingLinkRow): TrackingLink {
  return {
    id: row.id,
    organizationId: row.organizationId,
    campaignId: row.campaignId,
    recipientId: row.recipientId,
    code: row.code,
    targetUrl: row.targetUrl,
    phoneHash: row.phoneHash,
    emailHash: row.emailHash,
    firstClickedAt: row.firstClickedAt?.toISOString() ?? null,
    lastClickedAt: row.lastClickedAt?.toISOString() ?? null,
    clickCount: row.clickCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function smsMessageToContract(row: SmsMessageRow): SmsMessage {
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
    body: row.body,
    status: row.status,
    estimatedSegmentCount: row.estimatedSegmentCount,
    actualSegmentCount: row.actualSegmentCount,
    estimatedCostMinor: row.estimatedCostMinor,
    actualCostMinor: row.actualCostMinor,
    currency: row.currency,
    queuedAt: row.queuedAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function assertCampaignDraftStatus(row: Pick<CampaignRow, 'status'>) {
  if (row.status !== 'draft') {
    throw new Error('Campaign is not editable.');
  }
}

export function campaignAudienceWhere(
  organizationId: string,
  rule: CampaignAudienceRule,
  now = new Date(),
): SQL | undefined {
  assertOrganizationId(organizationId);
  const suppressionExists = phoneSuppressionExistsFilter(organizationId);

  return and(
    campaignAudienceDateWhere(rule, now),
    eq(contacts.organizationId, organizationId),
    isNotNull(contacts.normalizedPhone),
    eq(contacts.consentStatus, 'granted'),
    not(suppressionExists),
  );
}

export async function previewCampaignAudience(
  db: DbClient,
  input: {
    organizationId: string;
    audienceRule: CampaignAudienceRule;
    now?: Date;
  },
): Promise<CampaignAudiencePreviewResponse> {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const eligibleWhere = campaignAudienceWhere(
    input.organizationId,
    input.audienceRule,
    now,
  );
  const [eligibleRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(eligibleWhere);
  const [suppressedRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(
      campaignAudienceSuppressedWhere(
        input.organizationId,
        input.audienceRule,
        now,
      ),
    );
  const [incompleteRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(
      campaignAudienceIncompleteWhere(
        input.organizationId,
        input.audienceRule,
        now,
      ),
    );
  const [missingConsentRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(
      campaignAudienceMissingConsentWhere(
        input.organizationId,
        input.audienceRule,
        now,
      ),
    );
  const sampleRows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      phone: contacts.phone,
      lastBookingAt: contacts.lastBookingAt,
    })
    .from(contacts)
    .where(eligibleWhere)
    .orderBy(desc(contacts.lastBookingAt))
    .limit(10);

  return {
    eligibleCount: eligibleRow?.total ?? 0,
    suppressedCount: suppressedRow?.total ?? 0,
    incompleteCount: incompleteRow?.total ?? 0,
    missingConsentCount: missingConsentRow?.total ?? 0,
    sampleContacts: sampleRows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      lastBookingAt: row.lastBookingAt?.toISOString() ?? null,
    })),
  };
}

export async function createCampaignDraft(
  db: DbClient,
  input: {
    organizationId: string;
    createdByUserId: string;
    input: CreateCampaignDraftInput;
  },
): Promise<Campaign | null> {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .insert(campaigns)
    .values({
      organizationId: input.organizationId,
      createdByUserId: input.createdByUserId,
      name: input.input.name,
      status: 'draft',
      audienceRule: input.input.audienceRule,
      smsBody: input.input.smsBody,
      bookingUrl: input.input.bookingUrl,
      campaignCode: input.input.campaignCode,
      attributionWindowDays: input.input.attributionWindowDays,
    })
    .returning();

  return row ? campaignToContract(row) : null;
}

export async function listCampaigns(
  db: DbClient,
  input: { organizationId: string },
): Promise<{ campaigns: Campaign[] }> {
  assertOrganizationId(input.organizationId);

  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.organizationId, input.organizationId))
    .orderBy(desc(campaigns.createdAt));

  return { campaigns: rows.map(campaignToContract) };
}

export async function getCampaignById(
  db: DbClient,
  input: { organizationId: string; campaignId: string },
): Promise<Campaign | null> {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.organizationId, input.organizationId),
        eq(campaigns.id, input.campaignId),
      ),
    )
    .limit(1);

  return row ? campaignToContract(row) : null;
}

export async function updateCampaignDraft(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string;
    input: UpdateCampaignDraftInput;
  },
): Promise<UpdateCampaignDraftResult> {
  assertOrganizationId(input.organizationId);

  const [updated] = await db
    .update(campaigns)
    .set({
      ...campaignUpdateValues(input.input),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(campaigns.organizationId, input.organizationId),
        eq(campaigns.id, input.campaignId),
        eq(campaigns.status, 'draft'),
      ),
    )
    .returning();

  if (updated) {
    return { status: 'updated', campaign: campaignToContract(updated) };
  }

  const existing = await getCampaignById(db, input);

  if (!existing) {
    return { status: 'not_found' };
  }

  return { status: 'not_editable' };
}

export async function deleteCampaignDraft(
  db: DbClient,
  input: { organizationId: string; campaignId: string },
) {
  assertOrganizationId(input.organizationId);

  const [deleted] = await db
    .delete(campaigns)
    .where(
      and(
        eq(campaigns.organizationId, input.organizationId),
        eq(campaigns.id, input.campaignId),
        eq(campaigns.status, 'draft'),
      ),
    )
    .returning({ id: campaigns.id });

  return Boolean(deleted);
}

export async function listCampaignRecipients(
  db: DbClient,
  input: { organizationId: string; campaignId: string },
): Promise<{ recipients: CampaignRecipient[] }> {
  assertOrganizationId(input.organizationId);

  const rows = await db
    .select()
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.organizationId, input.organizationId),
        eq(campaignRecipients.campaignId, input.campaignId),
      ),
    )
    .orderBy(asc(campaignRecipients.createdAt));

  return { recipients: rows.map(recipientToContract) };
}

export async function countCampaignRecipients(
  db: DbClient,
  input: { organizationId: string; campaignId: string },
): Promise<{ recipientCount: number }> {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .select({ total: count() })
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.organizationId, input.organizationId),
        eq(campaignRecipients.campaignId, input.campaignId),
      ),
    );

  return { recipientCount: row?.total ?? 0 };
}

export async function listSelectedCampaignRecipientsForSend(
  db: DbClient,
  input: { organizationId: string; campaignId: string },
): Promise<{ recipients: CampaignRecipientForSend[] }> {
  assertOrganizationId(input.organizationId);

  const rows = await db
    .select()
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.organizationId, input.organizationId),
        eq(campaignRecipients.campaignId, input.campaignId),
        inArray(campaignRecipients.status, ['selected', 'sent']),
      ),
    )
    .orderBy(asc(campaignRecipients.createdAt));

  return { recipients: rows.map(recipientForSendToContract) };
}

export async function upsertTrackingLink(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string;
    recipientId: string;
    code: string;
    targetUrl: string;
    phoneHash: string | null;
    emailHash: string | null;
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
      phoneHash: input.phoneHash,
      emailHash: input.emailHash,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [trackingLinks.organizationId, trackingLinks.recipientId],
      set: {
        targetUrl: input.targetUrl,
        phoneHash: input.phoneHash,
        emailHash: input.emailHash,
        updatedAt: now,
      },
    })
    .returning();

  return row ? trackingLinkToContract(row) : null;
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
        smsMessages.campaignId,
        smsMessages.recipientId,
        smsMessages.direction,
      ],
    })
    .returning();

  if (created) {
    return { status: 'created', message: smsMessageToContract(created) };
  }

  const [existing] = await db
    .select()
    .from(smsMessages)
    .where(
      and(
        eq(smsMessages.organizationId, input.organizationId),
        eq(smsMessages.campaignId, input.campaignId),
        eq(smsMessages.recipientId, input.recipientId),
        eq(smsMessages.direction, 'outbound'),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error('Outbound SMS message was not created or found.');
  }

  return { status: 'existing', message: smsMessageToContract(existing) };
}

export async function startCampaignSend(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string;
    reservedCreditCount: number;
    now?: Date;
  },
): Promise<StartCampaignSendResult> {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const [activeSend] = await tx
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.organizationId, input.organizationId),
          eq(campaigns.status, 'sending'),
          ne(campaigns.id, input.campaignId),
        ),
      )
      .limit(1);

    if (activeSend) {
      return { status: 'active_send_exists' };
    }

    const [existing] = await tx
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.organizationId, input.organizationId),
          eq(campaigns.id, input.campaignId),
        ),
      )
      .limit(1);

    if (!existing) {
      return { status: 'not_found' };
    }

    if (existing.status === 'sending') {
      return { status: 'started', campaign: campaignToContract(existing) };
    }

    if (existing.status !== 'ready_to_send') {
      return { status: 'not_ready' };
    }

    const [updated] = await tx
      .update(campaigns)
      .set({
        status: 'sending',
        sendStartedAt: now,
        reservedCreditCount: input.reservedCreditCount,
        updatedAt: now,
      })
      .where(
        and(
          eq(campaigns.organizationId, input.organizationId),
          eq(campaigns.id, input.campaignId),
          eq(campaigns.status, 'ready_to_send'),
        ),
      )
      .returning();

    return updated
      ? { status: 'started', campaign: campaignToContract(updated) }
      : { status: 'not_ready' };
  });
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
      actualSegmentCount: input.actualSegmentCount,
      actualCostMinor: input.actualCostMinor,
      currency: input.currency,
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

export async function markCampaignRecipientSent(
  db: DbClient,
  input: { organizationId: string; recipientId: string; now?: Date },
) {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const [row] = await db
    .update(campaignRecipients)
    .set({
      status: 'sent',
      sentAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(campaignRecipients.organizationId, input.organizationId),
        eq(campaignRecipients.id, input.recipientId),
      ),
    )
    .returning();

  return row ? recipientToContract(row) : null;
}

export async function markCampaignRecipientSkipped(
  db: DbClient,
  input: {
    organizationId: string;
    recipientId: string;
    exclusionReason: string;
    now?: Date;
  },
) {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const [row] = await db
    .update(campaignRecipients)
    .set({
      status: 'skipped',
      exclusionReason: input.exclusionReason,
      updatedAt: now,
    })
    .where(
      and(
        eq(campaignRecipients.organizationId, input.organizationId),
        eq(campaignRecipients.id, input.recipientId),
      ),
    )
    .returning();

  return row ? recipientToContract(row) : null;
}

export async function markCampaignSendCompleted(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string;
    actualCreditCount: number;
    now?: Date;
  },
) {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const [row] = await db
    .update(campaigns)
    .set({
      status: 'sent',
      sentAt: now,
      actualCreditCount: input.actualCreditCount,
      updatedAt: now,
    })
    .where(
      and(
        eq(campaigns.organizationId, input.organizationId),
        eq(campaigns.id, input.campaignId),
        inArray(campaigns.status, ['ready_to_send', 'sending']),
      ),
    )
    .returning();

  return row ? campaignToContract(row) : null;
}

export async function launchCampaign(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string;
    actorUserId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    now?: Date;
  },
): Promise<LaunchCampaignResult> {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.organizationId, input.organizationId),
          eq(campaigns.id, input.campaignId),
        ),
      )
      .limit(1);

    if (!campaign) {
      return { status: 'not_found' };
    }

    if (campaign.status !== 'draft') {
      return { status: 'not_editable' };
    }

    if (!campaign.smsBody || !campaign.bookingUrl) {
      return { status: 'incomplete' };
    }

    const eligibleContacts = await tx
      .select({
        contactId: contacts.id,
        name: contacts.name,
        phone: contacts.phone,
        email: contacts.email,
        normalizedPhone: contacts.normalizedPhone,
        normalizedEmail: contacts.normalizedEmail,
        phoneHash: contacts.phoneHash,
        emailHash: contacts.emailHash,
        lastBookingAt: contacts.lastBookingAt,
        lastContactedAt: contacts.lastContactedAt,
      })
      .from(contacts)
      .where(
        campaignAudienceWhere(
          input.organizationId,
          campaign.audienceRule as CampaignAudienceRule,
          now,
        ),
      )
      .orderBy(asc(contacts.id));

    if (eligibleContacts.length === 0) {
      return { status: 'empty_audience' };
    }

    const [updatedCampaign] = await tx
      .update(campaigns)
      .set({
        status: 'ready_to_send',
        readyToSendAt: now,
        readyToSendByUserId: input.actorUserId,
        updatedAt: now,
      })
      .where(
        and(
          eq(campaigns.organizationId, input.organizationId),
          eq(campaigns.id, input.campaignId),
          eq(campaigns.status, 'draft'),
          eq(campaigns.updatedAt, campaign.updatedAt),
        ),
      )
      .returning();

    if (!updatedCampaign) {
      return { status: 'not_editable' };
    }

    let recipientCount = 0;
    const recipientSnapshots = eligibleContacts.map(
      (contact): CampaignRecipientInsert => ({
        organizationId: input.organizationId,
        campaignId: campaign.id,
        contactId: contact.contactId,
        status: 'selected',
        exclusionReason: null,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        normalizedPhone: contact.normalizedPhone,
        normalizedEmail: contact.normalizedEmail,
        phoneHash: contact.phoneHash,
        emailHash: contact.emailHash,
        lastBookingAt: contact.lastBookingAt,
        lastContactedAt: contact.lastContactedAt,
        selectedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    );

    for (const batch of chunkArray(
      recipientSnapshots,
      RECIPIENT_SNAPSHOT_INSERT_BATCH_SIZE,
    )) {
      const insertedRecipients = await tx
        .insert(campaignRecipients)
        .values(batch)
        .returning();

      recipientCount += insertedRecipients.length;
    }

    await tx
      .insert(auditLogs)
      .values(
        auditLogValues({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          eventType: 'campaign.ready_to_send',
          resourceType: 'campaign',
          resourceId: campaign.id,
          metadata: {
            audienceRule: campaign.audienceRule,
            campaignCode: campaign.campaignCode,
            recipientCount,
          },
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        }),
      )
      .returning();

    return {
      status: 'launched',
      campaign: campaignToContract(updatedCampaign),
      recipientCount,
    };
  });
}

export async function createAuditLog(
  db: DbClient,
  input: {
    organizationId: string;
    actorUserId: string;
    eventType: string;
    resourceType: string;
    resourceId: string;
    metadata: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  assertOrganizationId(input.organizationId);

  await db
    .insert(auditLogs)
    .values(auditLogValues(input))
    .returning();
}

function auditLogValues(input: {
  organizationId: string;
  actorUserId: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: input.metadata,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  };
}

function recipientForSendToContract(
  row: CampaignRecipientRow,
): CampaignRecipientForSend {
  return {
    id: row.id,
    organizationId: row.organizationId,
    campaignId: row.campaignId,
    contactId: row.contactId,
    status: row.status as CampaignRecipientStatus,
    exclusionReason: row.exclusionReason,
    name: row.name,
    phone: row.phone,
    email: row.email,
    normalizedPhone: row.normalizedPhone,
    normalizedEmail: row.normalizedEmail,
    phoneHash: row.phoneHash,
    emailHash: row.emailHash,
    lastBookingAt: row.lastBookingAt?.toISOString() ?? null,
    lastContactedAt: row.lastContactedAt?.toISOString() ?? null,
    selectedAt: row.selectedAt?.toISOString() ?? null,
  };
}

function chunkArray<T>(values: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
}

function campaignUpdateValues(input: UpdateCampaignDraftInput) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.audienceRule !== undefined ? { audienceRule: input.audienceRule } : {}),
    ...(input.smsBody !== undefined ? { smsBody: input.smsBody } : {}),
    ...(input.bookingUrl !== undefined ? { bookingUrl: input.bookingUrl } : {}),
    ...(input.campaignCode !== undefined
      ? { campaignCode: input.campaignCode }
      : {}),
    ...(input.attributionWindowDays !== undefined
      ? { attributionWindowDays: input.attributionWindowDays }
      : {}),
  };
}

function campaignAudienceDateWhere(rule: CampaignAudienceRule, now: Date) {
  const lapsedBefore = new Date(now);

  lapsedBefore.setUTCDate(lapsedBefore.getUTCDate() - rule.lapsedDays);

  const lapsedBooking = lte(contacts.lastBookingAt, lapsedBefore);

  return rule.includeNoBookingDate
    ? or(lapsedBooking, isNull(contacts.lastBookingAt))
    : lapsedBooking;
}

function campaignAudienceSuppressedWhere(
  organizationId: string,
  rule: CampaignAudienceRule,
  now: Date,
) {
  return and(
    campaignAudienceDateWhere(rule, now),
    eq(contacts.organizationId, organizationId),
    isNotNull(contacts.normalizedPhone),
    eq(contacts.consentStatus, 'granted'),
    phoneSuppressionExistsFilter(organizationId),
  );
}

function campaignAudienceIncompleteWhere(
  organizationId: string,
  rule: CampaignAudienceRule,
  now: Date,
) {
  return and(
    campaignAudienceDateWhere(rule, now),
    eq(contacts.organizationId, organizationId),
    isNull(contacts.normalizedPhone),
  );
}

function campaignAudienceMissingConsentWhere(
  organizationId: string,
  rule: CampaignAudienceRule,
  now: Date,
) {
  return and(
    campaignAudienceDateWhere(rule, now),
    eq(contacts.organizationId, organizationId),
    isNotNull(contacts.normalizedPhone),
    not(eq(contacts.consentStatus, 'granted')),
  );
}
