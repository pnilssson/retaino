import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  not,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  normalizeCampaignAudienceRule,
  type CampaignSmsTestContact,
  type CampaignSmsTestContactSearchResponse,
  type CampaignAudiencePreviewResponse,
  type CampaignAudienceRule,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import { campaignRecipients, campaigns, contacts } from '../schema';
import { assertOrganizationId, phoneSuppressionExistsFilter } from './contacts';

export type CampaignSendExclusionReason =
  | 'selected_campaign_send'
  | 'recent_campaign_send';

export function campaignAudienceWhere(
  organizationId: string,
  rule: CampaignAudienceRule,
  now = new Date(),
): SQL | undefined {
  assertOrganizationId(organizationId);
  const normalizedRule = normalizeCampaignAudienceRule(rule);

  return and(
    campaignAudienceBaseWhere(organizationId, normalizedRule, now),
    not(selectedCampaignSendExistsFilter(organizationId, normalizedRule)),
    not(recentCampaignSendExistsFilter(organizationId, normalizedRule, now)),
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
  const audienceRule = normalizeCampaignAudienceRule(input.audienceRule);
  const baseEligibleWhere = campaignAudienceBaseWhere(
    input.organizationId,
    audienceRule,
    now,
  );
  const selectedExclusionWhere = selectedCampaignSendExistsFilter(
    input.organizationId,
    audienceRule,
  );
  const recentExclusionWhere = recentCampaignSendExistsFilter(
    input.organizationId,
    audienceRule,
    now,
  );
  const eligibleWhere = and(
    baseEligibleWhere,
    not(selectedExclusionWhere),
    not(recentExclusionWhere),
  );
  const selectedCampaignsExcludedWhere = and(
    baseEligibleWhere,
    selectedExclusionWhere,
  );
  const recentCampaignExcludedWhere = and(
    baseEligibleWhere,
    not(selectedExclusionWhere),
    recentExclusionWhere,
  );
  const [baseEligibleRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(baseEligibleWhere);
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
        audienceRule,
        now,
      ),
    );
  const [incompleteRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(
      campaignAudienceIncompleteWhere(
        input.organizationId,
        audienceRule,
        now,
      ),
    );
  const [missingConsentRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(
      campaignAudienceMissingConsentWhere(
        input.organizationId,
        audienceRule,
        now,
      ),
    );
  const [recentExcludedRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(recentCampaignExcludedWhere);
  const [selectedExcludedRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(selectedCampaignsExcludedWhere);
  const excludedCampaigns = await previewExcludedCampaigns(db, {
    organizationId: input.organizationId,
    audienceRule,
    now,
  });
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
    baseEligibleCount: baseEligibleRow?.total ?? 0,
    eligibleCount: eligibleRow?.total ?? 0,
    suppressedCount: suppressedRow?.total ?? 0,
    incompleteCount: incompleteRow?.total ?? 0,
    missingConsentCount: missingConsentRow?.total ?? 0,
    recentCampaignExcludedCount: recentExcludedRow?.total ?? 0,
    selectedCampaignsExcludedCount: selectedExcludedRow?.total ?? 0,
    excludedCampaigns,
    sampleContacts: sampleRows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      lastBookingAt: row.lastBookingAt?.toISOString() ?? null,
    })),
  };
}

export async function searchCampaignTestSmsContacts(
  db: DbClient,
  input: {
    organizationId: string;
    audienceRule: CampaignAudienceRule;
    search?: string;
    now?: Date;
  },
): Promise<CampaignSmsTestContactSearchResponse> {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const audienceRule = normalizeCampaignAudienceRule(input.audienceRule);
  const search = input.search?.trim();
  const rows = await db
    .select(campaignTestSmsContactColumns())
    .from(contacts)
    .where(
      and(
        campaignAudienceWhere(input.organizationId, audienceRule, now),
        search ? campaignTestSmsContactSearchWhere(search) : undefined,
      ),
    )
    .orderBy(desc(contacts.lastBookingAt), desc(contacts.createdAt))
    .limit(10);

  return { contacts: rows.map(campaignTestSmsContactToContract) };
}

export async function getCampaignTestSmsContact(
  db: DbClient,
  input: {
    organizationId: string;
    audienceRule: CampaignAudienceRule;
    contactId: string;
    now?: Date;
  },
): Promise<CampaignSmsTestContact | null> {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const audienceRule = normalizeCampaignAudienceRule(input.audienceRule);
  const [row] = await db
    .select(campaignTestSmsContactColumns())
    .from(contacts)
    .where(
      and(
        eq(contacts.id, input.contactId),
        campaignAudienceWhere(input.organizationId, audienceRule, now),
      ),
    )
    .limit(1);

  return row ? campaignTestSmsContactToContract(row) : null;
}

export async function findCampaignSendExclusionForRecipient(
  db: DbClient,
  input: {
    organizationId: string;
    currentCampaignId: string;
    contactId: string | null;
    phoneHash: string | null;
    audienceRule: CampaignAudienceRule;
    now?: Date;
  },
): Promise<CampaignSendExclusionReason | null> {
  assertOrganizationId(input.organizationId);
  const audienceRule = normalizeCampaignAudienceRule(input.audienceRule);
  const now = input.now ?? new Date();

  if (audienceRule.excludeCampaignIds.length > 0) {
    const [selectedCampaignRecipient] = await db
      .select({ id: campaignRecipients.id })
      .from(campaignRecipients)
      .where(
        campaignRecipientMembershipWhere({
          organizationId: input.organizationId,
          contactId: input.contactId,
          phoneHash: input.phoneHash,
          campaignIds: audienceRule.excludeCampaignIds,
        }),
      )
      .limit(1);

    if (selectedCampaignRecipient) {
      return 'selected_campaign_send';
    }
  }

  if (audienceRule.recentCampaignExclusionDays !== null) {
    const [recentCampaignRecipient] = await db
      .select({ id: campaignRecipients.id })
      .from(campaignRecipients)
      .where(
        campaignRecipientMembershipWhere({
          organizationId: input.organizationId,
          contactId: input.contactId,
          phoneHash: input.phoneHash,
          recentSince: recentCampaignExclusionSince(
            audienceRule.recentCampaignExclusionDays,
            now,
          ),
          currentCampaignId: input.currentCampaignId,
        }),
      )
      .limit(1);

    if (recentCampaignRecipient) {
      return 'recent_campaign_send';
    }
  }

  return null;
}

function campaignTestSmsContactColumns() {
  return {
    id: contacts.id,
    name: contacts.name,
    phone: contacts.phone,
    email: contacts.email,
    lastBookingAt: contacts.lastBookingAt,
  };
}

function campaignTestSmsContactSearchWhere(search: string) {
  const pattern = `%${search}%`;

  return or(
    ilike(contacts.name, pattern),
    ilike(contacts.phone, pattern),
    ilike(contacts.email, pattern),
  );
}

function campaignTestSmsContactToContract(row: {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  lastBookingAt: Date | null;
}): CampaignSmsTestContact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    lastBookingAt: row.lastBookingAt?.toISOString() ?? null,
  };
}

function campaignAudienceBaseWhere(
  organizationId: string,
  rule: CampaignAudienceRule,
  now: Date,
) {
  const suppressionExists = phoneSuppressionExistsFilter(organizationId);

  return and(
    campaignAudienceDateWhere(rule, now),
    eq(contacts.organizationId, organizationId),
    isNotNull(contacts.normalizedPhone),
    eq(contacts.consentStatus, 'granted'),
    not(suppressionExists),
  );
}

async function previewExcludedCampaigns(
  db: DbClient,
  input: {
    organizationId: string;
    audienceRule: CampaignAudienceRule;
    now: Date;
  },
) {
  if (input.audienceRule.excludeCampaignIds.length === 0) {
    return [];
  }

  const rows = [];

  for (const campaignId of input.audienceRule.excludeCampaignIds) {
    const [campaign] = await db
      .select({ id: campaigns.id, name: campaigns.name })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.organizationId, input.organizationId),
          eq(campaigns.id, campaignId),
        ),
      )
      .limit(1);

    if (!campaign) {
      continue;
    }

    const [excludedRow] = await db
      .select({ total: count() })
      .from(contacts)
      .where(
        and(
          campaignAudienceBaseWhere(
            input.organizationId,
            input.audienceRule,
            input.now,
          ),
          selectedCampaignSendExistsFilter(input.organizationId, {
            ...input.audienceRule,
            excludeCampaignIds: [campaignId],
          }),
        ),
      );

    rows.push({
      id: campaign.id,
      name: campaign.name,
      excludedCount: excludedRow?.total ?? 0,
    });
  }

  return rows;
}

function campaignAudienceDateWhere(rule: CampaignAudienceRule, now: Date) {
  const lapsedBefore = new Date(now);

  lapsedBefore.setUTCDate(lapsedBefore.getUTCDate() - rule.lapsedDays);

  const lapsedBooking = lte(contacts.lastBookingAt, lapsedBefore);

  return rule.includeNoBookingDate
    ? or(lapsedBooking, isNull(contacts.lastBookingAt))
    : lapsedBooking;
}

function selectedCampaignSendExistsFilter(
  organizationId: string,
  rule: CampaignAudienceRule,
) {
  if (rule.excludeCampaignIds.length === 0) {
    return sql`false`;
  }

  return sql`exists (
    select 1 from ${campaignRecipients}
    where ${campaignRecipients.organizationId} = ${organizationId}
      and ${campaignRecipients.campaignId} in (${campaignIdSqlList(rule.excludeCampaignIds)})
      and ${campaignRecipients.sentAt} is not null
      and ${campaignRecipientMatchesContactFilter()}
  )`;
}

function recentCampaignSendExistsFilter(
  organizationId: string,
  rule: CampaignAudienceRule,
  now: Date,
) {
  if (rule.recentCampaignExclusionDays === null) {
    return sql`false`;
  }

  const recentSince = recentCampaignExclusionSince(
    rule.recentCampaignExclusionDays,
    now,
  );

  return sql`exists (
    select 1 from ${campaignRecipients}
    where ${campaignRecipients.organizationId} = ${organizationId}
      and ${campaignRecipients.sentAt} is not null
      and ${campaignRecipients.sentAt} >= ${recentSince}
      and ${campaignRecipientMatchesContactFilter()}
  )`;
}

function campaignRecipientMatchesContactFilter() {
  return sql`(
    ${campaignRecipients.contactId} = ${contacts.id}
    or (
      ${contacts.phoneHash} is not null
      and ${campaignRecipients.phoneHash} = ${contacts.phoneHash}
    )
  )`;
}

function campaignRecipientMembershipWhere(input: {
  organizationId: string;
  contactId: string | null;
  phoneHash: string | null;
  campaignIds?: string[];
  recentSince?: Date;
  currentCampaignId?: string;
}) {
  const identityWhere = or(
    input.contactId
      ? eq(campaignRecipients.contactId, input.contactId)
      : undefined,
    input.phoneHash
      ? eq(campaignRecipients.phoneHash, input.phoneHash)
      : undefined,
  );

  if (!identityWhere) {
    return sql`false`;
  }

  return and(
    eq(campaignRecipients.organizationId, input.organizationId),
    input.campaignIds && input.campaignIds.length > 0
      ? inArray(campaignRecipients.campaignId, input.campaignIds)
      : undefined,
    input.recentSince
      ? gte(campaignRecipients.sentAt, input.recentSince)
      : undefined,
    input.currentCampaignId
      ? ne(campaignRecipients.campaignId, input.currentCampaignId)
      : undefined,
    isNotNull(campaignRecipients.sentAt),
    identityWhere,
  );
}

function campaignIdSqlList(campaignIds: string[]) {
  return sql.join(
    campaignIds.map((campaignId) => sql`${campaignId}`),
    sql`, `,
  );
}

function recentCampaignExclusionSince(days: 7 | 14 | 30, now: Date) {
  const recentSince = new Date(now);

  recentSince.setUTCDate(recentSince.getUTCDate() - days);

  return recentSince;
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
