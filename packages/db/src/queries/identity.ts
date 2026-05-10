import { and, eq } from 'drizzle-orm';
import type {
  LegalDocumentVersion,
  OrganizationAcceptance,
  OrganizationContext,
  OrganizationProfile,
  User,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import {
  organizationAcceptances,
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toOrganizationAcceptance(
  row: typeof organizationAcceptances.$inferSelect,
): OrganizationAcceptance {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    legalDocumentVersionId: row.legalDocumentVersionId,
    documentType: row.documentType,
    documentVersion: row.documentVersion,
    contentHash: row.contentHash,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    acceptedAt: row.acceptedAt.toISOString(),
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

export async function createOrganizationAcceptance(
  db: DbClient,
  input: {
    organizationId: string;
    userId: string;
    legalDocumentVersion: LegalDocumentVersion;
    ipAddress: string | null;
    userAgent: string | null;
  },
) {
  const [acceptance] = await db
    .insert(organizationAcceptances)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      legalDocumentVersionId: input.legalDocumentVersion.id,
      documentType: input.legalDocumentVersion.documentType,
      documentVersion: input.legalDocumentVersion.documentVersion,
      contentHash: input.legalDocumentVersion.contentHash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    })
    .onConflictDoNothing({
      target: [
        organizationAcceptances.organizationId,
        organizationAcceptances.legalDocumentVersionId,
      ],
    })
    .returning();

  if (acceptance) {
    return toOrganizationAcceptance(acceptance);
  }

  const [existingAcceptance] = await db
    .select()
    .from(organizationAcceptances)
    .where(
      and(
        eq(organizationAcceptances.organizationId, input.organizationId),
        eq(
          organizationAcceptances.legalDocumentVersionId,
          input.legalDocumentVersion.id,
        ),
      ),
    )
    .limit(1);

  return existingAcceptance ? toOrganizationAcceptance(existingAcceptance) : null;
}

export async function listOrganizationAcceptedDocuments(
  db: DbClient,
  organizationId: string,
) {
  const rows = await db
    .select({
      legalDocumentVersionId: organizationAcceptances.legalDocumentVersionId,
      documentType: organizationAcceptances.documentType,
      documentVersion: organizationAcceptances.documentVersion,
      contentHash: organizationAcceptances.contentHash,
    })
    .from(organizationAcceptances)
    .where(eq(organizationAcceptances.organizationId, organizationId));

  return rows;
}
