import {
  and,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  lte,
  not,
  or,
  type SQL,
} from 'drizzle-orm';
import type {
  Campaign,
  CampaignAudienceRule,
  CampaignAudiencePreviewResponse,
  CampaignStatus,
  CreateCampaignDraftInput,
  UpdateCampaignDraftInput,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import { campaigns, contacts } from '../schema';
import { assertOrganizationId, phoneSuppressionExistsFilter } from './contacts';

type CampaignRow = typeof campaigns.$inferSelect;

export type UpdateCampaignDraftResult =
  | { status: 'updated'; campaign: Campaign }
  | { status: 'not_found' }
  | { status: 'not_editable' };

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
