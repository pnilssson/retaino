import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import {
  normalizeCampaignAudienceRule,
  type Campaign,
  type CampaignRecipientStatus,
  type CampaignRecipientSearchItem,
  type CampaignStatus,
  type CreateCampaignDraftInput,
  type UpdateCampaignDraftInput,
} from '@retaino/shared/contracts';
import { auditEvents } from '../audit-events';
import type { DbClient } from '../client';
import {
  campaignRecipients,
  campaigns,
  contacts,
} from '../schema';
import { recordAuditLog } from './audit-logs';
import {
  campaignAudienceWhere,
} from './campaign-audience';
import { assertOrganizationId } from './contacts';

type CampaignRow = typeof campaigns.$inferSelect;
type CampaignRecipientRow = typeof campaignRecipients.$inferSelect;
type CampaignRecipientInsert = typeof campaignRecipients.$inferInsert;

const RECIPIENT_SNAPSHOT_INSERT_BATCH_SIZE = 1000;
const ACTIVE_SEND_UNIQUE_INDEX = 'campaigns_organization_sending_idx';

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

function campaignToContract(row: CampaignRow): Campaign {
  return {
    id: row.id,
    organizationId: row.organizationId,
    createdByUserId: row.createdByUserId,
    name: row.name,
    status: row.status as CampaignStatus,
    audienceRule: normalizeCampaignAudienceRule(row.audienceRule),
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

function recipientToContract(row: CampaignRecipientRow) {
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
      audienceRule: normalizeCampaignAudienceRule(input.input.audienceRule),
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

export async function searchCampaignRecipientsForReportedBookings(
  db: DbClient,
  input: { organizationId: string; campaignId: string; search: string },
): Promise<{ recipients: CampaignRecipientSearchItem[] }> {
  assertOrganizationId(input.organizationId);
  const search = input.search.trim();

  if (search.length < 2) {
    return { recipients: [] };
  }

  const rows = await db
    .select({
      id: campaignRecipients.id,
      contactId: campaignRecipients.contactId,
      name: campaignRecipients.name,
      phone: campaignRecipients.phone,
      email: campaignRecipients.email,
    })
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.organizationId, input.organizationId),
        eq(campaignRecipients.campaignId, input.campaignId),
        isNotNull(campaignRecipients.contactId),
        inArray(campaignRecipients.status, ['selected', 'queued', 'sent']),
        or(
          ilike(campaignRecipients.name, `%${search}%`),
          ilike(campaignRecipients.phone, `%${search}%`),
          ilike(campaignRecipients.email, `%${search}%`),
        ),
      ),
    )
    .orderBy(asc(campaignRecipients.name), asc(campaignRecipients.createdAt))
    .limit(8);

  return {
    recipients: rows.map((row) => ({
      id: row.id,
      contactId: row.contactId as string,
      name: row.name,
      phone: row.phone,
      email: row.email,
    })),
  };
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

export async function getLatestCampaignRecipientByPhoneHash(
  db: DbClient,
  input: { organizationId: string; phoneHash: string },
) {
  assertOrganizationId(input.organizationId);
  const [row] = await db
    .select()
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.organizationId, input.organizationId),
        eq(campaignRecipients.phoneHash, input.phoneHash),
        isNotNull(campaignRecipients.sentAt),
      ),
    )
    .orderBy(desc(campaignRecipients.sentAt), desc(campaignRecipients.createdAt))
    .limit(1);

  return row ? recipientToContract(row) : null;
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

  try {
    return await db.transaction(async (tx) => {
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
  } catch (error) {
    if (isUniqueConstraintViolation(error, ACTIVE_SEND_UNIQUE_INDEX)) {
      return { status: 'active_send_exists' };
    }

    throw error;
  }
}

export async function markCampaignRecipientSent(
  db: DbClient,
  input: { organizationId: string; recipientId: string; now?: Date },
) {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(campaignRecipients)
      .set({
        status: 'sent',
        sentAt: sql`coalesce(${campaignRecipients.sentAt}, ${now})`,
        updatedAt: now,
      })
      .where(
        and(
          eq(campaignRecipients.organizationId, input.organizationId),
          eq(campaignRecipients.id, input.recipientId),
        ),
      )
      .returning();

    if (!row) {
      return null;
    }

    await updateContactLastContactedAt(tx, {
      organizationId: input.organizationId,
      contactId: row.contactId,
      lastContactedAt: row.sentAt,
      now,
    });

    return recipientToContract(row);
  });
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

export async function markCampaignSendFailed(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string;
    failureReason: string;
    actualCreditCount: number;
    now?: Date;
  },
) {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const [row] = await db
    .update(campaigns)
    .set({
      status: 'failed',
      failedAt: now,
      failureReason: input.failureReason,
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
    recentCampaignExclusionAcknowledged?: boolean | undefined;
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

    const audienceRule = normalizeCampaignAudienceRule(campaign.audienceRule);

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
          audienceRule,
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

    await recordAuditLog(
      tx,
      auditEvents.campaignReadyToSend({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        campaignId: campaign.id,
        audienceRule,
        smsBody: campaign.smsBody,
        bookingUrl: campaign.bookingUrl,
        campaignCode: campaign.campaignCode,
        attributionWindowDays: campaign.attributionWindowDays,
        recipientCount,
        recentCampaignExclusionAcknowledged:
          input.recentCampaignExclusionAcknowledged ?? false,
        userAgent: input.userAgent ?? null,
      }),
    );

    return {
      status: 'launched',
      campaign: campaignToContract(updatedCampaign),
      recipientCount,
    };
  });
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

async function updateContactLastContactedAt(
  db: Pick<DbClient, 'update'>,
  input: {
    organizationId: string;
    contactId: string | null;
    lastContactedAt: Date | null;
    now: Date;
  },
) {
  if (!input.contactId || !input.lastContactedAt) {
    return;
  }

  await db
    .update(contacts)
    .set({
      lastContactedAt: input.lastContactedAt,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(contacts.organizationId, input.organizationId),
        eq(contacts.id, input.contactId),
        or(
          isNull(contacts.lastContactedAt),
          lt(contacts.lastContactedAt, input.lastContactedAt),
        ),
      ),
    );
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
    ...(input.audienceRule !== undefined
      ? { audienceRule: normalizeCampaignAudienceRule(input.audienceRule) }
      : {}),
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

function isUniqueConstraintViolation(error: unknown, constraintName: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'constraint' in error &&
    error.code === '23505' &&
    error.constraint === constraintName
  ) {
    return true;
  }

  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return isUniqueConstraintViolation(error.cause, constraintName);
  }

  return false;
}
