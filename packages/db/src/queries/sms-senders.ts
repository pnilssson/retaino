import { and, eq, or } from 'drizzle-orm';
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
    .where(and(eq(organizationSmsSenders.provider, input.provider), or(...filters)))
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
        updatedAt: now,
      },
    })
    .returning();

  return row ? organizationSmsSenderToContract(row) : null;
}
