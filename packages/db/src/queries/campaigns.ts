import { and, desc, eq } from 'drizzle-orm';
import type {
  Campaign,
  CampaignAudienceRule,
  CampaignStatus,
  CreateCampaignDraftInput,
  UpdateCampaignDraftInput,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import { campaigns } from '../schema';
import { assertOrganizationId } from './contacts';

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
