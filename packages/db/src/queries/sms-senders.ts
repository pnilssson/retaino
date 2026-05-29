import { and, asc, eq, isNotNull, lte, not, sql } from 'drizzle-orm';
import type {
  OrganizationSmsSender,
  SmsSenderNumberType,
  SmsSenderProvider,
  SmsSenderStatus,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import { organizationSmsSenders } from '../schema';
import { assertOrganizationId } from './contacts';

type OrganizationSmsSenderRow = typeof organizationSmsSenders.$inferSelect;

export type UpsertOrganizationSmsSenderInput = {
  organizationId: string;
  provider: SmsSenderProvider;
  status: SmsSenderStatus;
  phoneNumber: string | null;
  countryCode: string | null;
  numberType: SmsSenderNumberType | null;
  providerMessagingServiceId: string | null;
  providerPhoneNumberId: string | null;
  regulatoryStatus: string | null;
  failureReason: string | null;
  provisionedAt: Date | null;
  lastVerifiedAt: Date | null;
  releaseScheduledAt: Date | null;
  releasedAt: Date | null;
};

export function organizationSmsSenderToContract(
  row: OrganizationSmsSenderRow,
): OrganizationSmsSender {
  return {
    id: row.id,
    organizationId: row.organizationId,
    provider: row.provider as SmsSenderProvider,
    status: row.status as SmsSenderStatus,
    phoneNumber: row.phoneNumber,
    countryCode: row.countryCode,
    numberType: row.numberType as SmsSenderNumberType | null,
    providerMessagingServiceId: row.providerMessagingServiceId,
    providerPhoneNumberId: row.providerPhoneNumberId,
    regulatoryStatus: row.regulatoryStatus,
    failureReason: row.failureReason,
    provisionedAt: row.provisionedAt?.toISOString() ?? null,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    releaseScheduledAt: row.releaseScheduledAt?.toISOString() ?? null,
    releasedAt: row.releasedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrganizationSmsSender(
  db: DbClient,
  input: { organizationId: string; provider?: SmsSenderProvider },
) {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .select()
    .from(organizationSmsSenders)
    .where(
      and(
        eq(organizationSmsSenders.organizationId, input.organizationId),
        eq(organizationSmsSenders.provider, input.provider ?? 'twilio'),
      ),
    )
    .limit(1);

  return row ? organizationSmsSenderToContract(row) : null;
}

export async function getOrganizationSmsSenderByProviderReference(
  db: DbClient,
  input: {
    provider: SmsSenderProvider;
    providerMessagingServiceId?: string | null;
    providerPhoneNumberId?: string | null;
    phoneNumber?: string | null;
  },
) {
  const filters = [
    input.providerMessagingServiceId
      ? eq(
          organizationSmsSenders.providerMessagingServiceId,
          input.providerMessagingServiceId,
        )
      : undefined,
    input.providerPhoneNumberId
      ? eq(
          organizationSmsSenders.providerPhoneNumberId,
          input.providerPhoneNumberId,
        )
      : undefined,
    input.phoneNumber
      ? eq(organizationSmsSenders.phoneNumber, input.phoneNumber)
      : undefined,
  ].filter(Boolean);

  if (filters.length === 0) {
    return null;
  }

  const [row] = await db
    .select()
    .from(organizationSmsSenders)
    .where(and(eq(organizationSmsSenders.provider, input.provider), ...filters))
    .limit(1);

  return row ? organizationSmsSenderToContract(row) : null;
}

export async function upsertOrganizationSmsSender(
  db: DbClient,
  input: UpsertOrganizationSmsSenderInput,
) {
  assertOrganizationId(input.organizationId);

  const now = new Date();
  const [row] = await db
    .insert(organizationSmsSenders)
    .values(input)
    .onConflictDoUpdate({
      target: [
        organizationSmsSenders.organizationId,
        organizationSmsSenders.provider,
      ],
      set: {
        status: input.status,
        phoneNumber: input.phoneNumber,
        countryCode: input.countryCode,
        numberType: input.numberType,
        providerMessagingServiceId: input.providerMessagingServiceId,
        providerPhoneNumberId: input.providerPhoneNumberId,
        regulatoryStatus: input.regulatoryStatus,
        failureReason: input.failureReason,
        provisionedAt: input.provisionedAt,
        lastVerifiedAt: input.lastVerifiedAt,
        releaseScheduledAt: input.releaseScheduledAt,
        releasedAt: input.releasedAt,
        updatedAt: now,
      },
    })
    .returning();

  return row ? organizationSmsSenderToContract(row) : null;
}

export async function scheduleOrganizationSmsSenderRelease(
  db: DbClient,
  input: {
    organizationId: string;
    provider: SmsSenderProvider;
    status: Extract<SmsSenderStatus, 'ready' | 'release_pending'>;
    releaseScheduledAt: Date;
    preserveEarlierSchedule?: boolean;
  },
) {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .update(organizationSmsSenders)
    .set({
      status: scheduledSenderStatus(input.status),
      releaseScheduledAt: input.preserveEarlierSchedule
        ? sql`least(coalesce(${organizationSmsSenders.releaseScheduledAt}, ${input.releaseScheduledAt}), ${input.releaseScheduledAt})`
        : input.releaseScheduledAt,
      releasedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationSmsSenders.organizationId, input.organizationId),
        eq(organizationSmsSenders.provider, input.provider),
        not(eq(organizationSmsSenders.status, 'released')),
      ),
    )
    .returning();

  return row ? organizationSmsSenderToContract(row) : null;
}

export async function clearOrganizationSmsSenderReleaseSchedule(
  db: DbClient,
  input: {
    organizationId: string;
    provider: SmsSenderProvider;
  },
) {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .update(organizationSmsSenders)
    .set({
      status: sql`case when ${organizationSmsSenders.status} in ('release_pending', 'release_failed') then 'ready' else ${organizationSmsSenders.status} end`,
      releaseScheduledAt: null,
      releasedAt: null,
      failureReason: sql`case when ${organizationSmsSenders.status} in ('release_pending', 'release_failed') then null else ${organizationSmsSenders.failureReason} end`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationSmsSenders.organizationId, input.organizationId),
        eq(organizationSmsSenders.provider, input.provider),
        not(eq(organizationSmsSenders.status, 'released')),
      ),
    )
    .returning();

  return row ? organizationSmsSenderToContract(row) : null;
}

export async function listOrganizationSmsSendersDueForRelease(
  db: DbClient,
  input: {
    now: Date;
    limit: number;
  },
) {
  const rows = await db
    .select()
    .from(organizationSmsSenders)
    .where(
      and(
        lte(organizationSmsSenders.releaseScheduledAt, input.now),
        not(eq(organizationSmsSenders.status, 'released')),
        isNotNull(organizationSmsSenders.providerPhoneNumberId),
      ),
    )
    .orderBy(asc(organizationSmsSenders.releaseScheduledAt))
    .limit(input.limit);

  return rows.map(organizationSmsSenderToContract);
}

function scheduledSenderStatus(
  status: Extract<SmsSenderStatus, 'ready' | 'release_pending'>,
) {
  if (status === 'ready') {
    return sql`${organizationSmsSenders.status}`;
  }

  return sql`case when ${organizationSmsSenders.status} in ('ready', 'release_pending', 'release_failed') then ${status} else ${organizationSmsSenders.status} end`;
}

export async function markOrganizationSmsSenderReleased(
  db: DbClient,
  input: {
    id: string;
    releasedAt: Date;
  },
) {
  const [row] = await db
    .update(organizationSmsSenders)
    .set({
      status: 'released',
      phoneNumber: null,
      providerMessagingServiceId: null,
      providerPhoneNumberId: null,
      regulatoryStatus: null,
      failureReason: null,
      releasedAt: input.releasedAt,
      updatedAt: new Date(),
    })
    .where(eq(organizationSmsSenders.id, input.id))
    .returning();

  return row ? organizationSmsSenderToContract(row) : null;
}

export async function markOrganizationSmsSenderReleaseFailed(
  db: DbClient,
  input: {
    id: string;
    failureReason: string;
  },
) {
  const [row] = await db
    .update(organizationSmsSenders)
    .set({
      status: 'release_failed',
      failureReason: input.failureReason,
      updatedAt: new Date(),
    })
    .where(eq(organizationSmsSenders.id, input.id))
    .returning();

  return row ? organizationSmsSenderToContract(row) : null;
}
