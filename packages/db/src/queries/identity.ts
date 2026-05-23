import { and, eq } from 'drizzle-orm';
import type {
  LegalBundle,
  LegalBundleDocumentSnapshot,
  OrganizationContext,
  OrganizationLegalAcceptance,
  OrganizationProfile,
  User,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import {
  organizationLegalAcceptances,
  organizationProfiles,
  organizations,
  users,
} from '../schema';

function toUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    clerkUserId: row.clerkUserId,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toOrganizationContext(
  row: typeof organizations.$inferSelect,
  role: string,
): OrganizationContext {
  return {
    id: row.id,
    clerkOrganizationId: row.clerkOrganizationId,
    name: row.name,
    slug: row.slug,
    onboardingStatus: row.onboardingStatus,
    role,
  };
}

function toOrganizationProfile(
  row: typeof organizationProfiles.$inferSelect,
): OrganizationProfile {
  return {
    id: row.id,
    organizationId: row.organizationId,
    legalName: row.legalName,
    registrationNumber: row.registrationNumber,
    billingEmail: row.billingEmail,
    responsibleName: row.responsibleName,
    responsibleEmail: row.responsibleEmail,
    responsiblePhone: row.responsiblePhone,
    countryCode: row.countryCode,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDocumentSnapshots(value: unknown): LegalBundleDocumentSnapshot[] {
  return Array.isArray(value) ? (value as LegalBundleDocumentSnapshot[]) : [];
}

function toOrganizationLegalAcceptance(
  row: typeof organizationLegalAcceptances.$inferSelect,
  acceptedByEmail: string | null,
): OrganizationLegalAcceptance {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    bundleVersion: row.bundleVersion,
    bundleHash: row.bundleHash,
    documentsSnapshot: toDocumentSnapshots(row.documentsSnapshot),
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    acceptedAt: row.acceptedAt.toISOString(),
    acceptedByEmail,
  };
}

export async function upsertUserByClerkId(
  db: DbClient,
  input: {
    clerkUserId: string;
    email: string | null;
  },
) {
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: input.clerkUserId,
      email: input.email,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email: input.email,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user ? toUser(user) : null;
}

export async function upsertOrganizationByClerkId(
  db: DbClient,
  input: {
    clerkOrganizationId: string;
    name: string;
    slug: string | null;
  },
) {
  const [organization] = await db
    .insert(organizations)
    .values(input)
    .onConflictDoUpdate({
      target: organizations.clerkOrganizationId,
      set: {
        name: input.name,
        slug: input.slug,
        updatedAt: new Date(),
      },
    })
    .returning();

  return organization ?? null;
}

export async function getOrganizationContext(
  db: DbClient,
  input: {
    clerkOrganizationId: string;
    role: string;
  },
): Promise<OrganizationContext | null> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, input.clerkOrganizationId))
    .limit(1);

  if (!organization) {
    return null;
  }

  return toOrganizationContext(organization, input.role);
}

export async function getOrganizationProfileByOrganizationId(
  db: DbClient,
  organizationId: string,
) {
  const [profile] = await db
    .select()
    .from(organizationProfiles)
    .where(eq(organizationProfiles.organizationId, organizationId))
    .limit(1);

  return profile ? toOrganizationProfile(profile) : null;
}

export async function upsertOrganizationProfile(
  db: DbClient,
  input: {
    organizationId: string;
    legalName: string;
    registrationNumber: string;
    billingEmail: string;
    responsibleName: string;
    responsibleEmail: string;
    responsiblePhone?: string | undefined;
    countryCode: string;
    currency: string;
  },
) {
  const [profile] = await db
    .insert(organizationProfiles)
    .values({
      ...input,
      responsiblePhone: input.responsiblePhone ?? null,
    })
    .onConflictDoUpdate({
      target: organizationProfiles.organizationId,
      set: {
        legalName: input.legalName,
        registrationNumber: input.registrationNumber,
        billingEmail: input.billingEmail,
        responsibleName: input.responsibleName,
        responsibleEmail: input.responsibleEmail,
        responsiblePhone: input.responsiblePhone ?? null,
        countryCode: input.countryCode,
        currency: input.currency,
        updatedAt: new Date(),
      },
    })
    .returning();

  return profile ? toOrganizationProfile(profile) : null;
}

export async function markOrganizationOnboardingComplete(
  db: DbClient,
  organizationId: string,
) {
  const [organization] = await db
    .update(organizations)
    .set({
      onboardingStatus: 'complete',
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  return organization ?? null;
}

export async function createOrganizationLegalAcceptance(
  db: DbClient,
  input: {
    organizationId: string;
    userId: string;
    legalBundle: LegalBundle;
    ipAddress: string | null;
    userAgent: string | null;
  },
) {
  const [acceptance] = await db
    .insert(organizationLegalAcceptances)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      bundleVersion: input.legalBundle.version,
      bundleHash: input.legalBundle.hash,
      documentsSnapshot: input.legalBundle.documents,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    })
    .onConflictDoNothing({
      target: [
        organizationLegalAcceptances.organizationId,
        organizationLegalAcceptances.bundleVersion,
      ],
    })
    .returning();

  if (acceptance) {
    const [actor] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, acceptance.userId))
      .limit(1);

    return toOrganizationLegalAcceptance(acceptance, actor?.email ?? null);
  }

  const [existingAcceptance] = await db
    .select()
    .from(organizationLegalAcceptances)
    .where(
      and(
        eq(organizationLegalAcceptances.organizationId, input.organizationId),
        eq(
          organizationLegalAcceptances.bundleVersion,
          input.legalBundle.version,
        ),
      ),
    )
    .limit(1);

  if (!existingAcceptance) {
    return null;
  }

  const [actor] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, existingAcceptance.userId))
    .limit(1);

  return toOrganizationLegalAcceptance(existingAcceptance, actor?.email ?? null);
}

export async function getCurrentOrganizationLegalAcceptance(
  db: DbClient,
  input: {
    organizationId: string;
    bundleVersion: string;
  },
) {
  const [row] = await db
    .select({
      acceptance: organizationLegalAcceptances,
      acceptedByEmail: users.email,
    })
    .from(organizationLegalAcceptances)
    .innerJoin(users, eq(users.id, organizationLegalAcceptances.userId))
    .where(
      and(
        eq(organizationLegalAcceptances.organizationId, input.organizationId),
        eq(organizationLegalAcceptances.bundleVersion, input.bundleVersion),
      ),
    )
    .limit(1);

  return row
    ? toOrganizationLegalAcceptance(row.acceptance, row.acceptedByEmail)
    : null;
}
