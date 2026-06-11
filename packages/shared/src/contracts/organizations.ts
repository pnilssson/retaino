import { z } from 'zod';

import { idSchema, nonEmptyStringSchema, timestampSchema } from '../schemas';
import { currencyCodeSchema } from '../money';
import { localeSchema } from './legal';
import {
  legalBundleDocumentSnapshotSchema,
  type LegalBundle,
} from './legal';
import { countryCodeSchema, normalizePhoneNumber } from './contacts';
import type { User } from './users';

export const organizationContextSchema = z.object({
  id: idSchema,
  clerkOrganizationId: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  slug: nonEmptyStringSchema.nullable(),
  onboardingStatus: nonEmptyStringSchema,
  role: nonEmptyStringSchema,
});

export const organizationProfileSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  legalName: nonEmptyStringSchema,
  registrationNumber: nonEmptyStringSchema,
  billingEmail: z.email(),
  responsibleName: nonEmptyStringSchema,
  responsibleEmail: z.email(),
  responsiblePhone: nonEmptyStringSchema.nullable(),
  countryCode: countryCodeSchema,
  currency: currencyCodeSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const organizationLegalAcceptanceSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  userId: idSchema,
  locale: localeSchema,
  bundleVersion: nonEmptyStringSchema,
  bundleHash: z.string().regex(/^[a-f0-9]{64}$/),
  documentsSnapshot: z.array(legalBundleDocumentSnapshotSchema),
  ipAddress: nonEmptyStringSchema.nullable(),
  userAgent: nonEmptyStringSchema.nullable(),
  acceptedAt: timestampSchema,
  acceptedByEmail: z.email().nullable(),
});

export type OrganizationContext = z.infer<typeof organizationContextSchema>;
export type OrganizationProfile = z.infer<typeof organizationProfileSchema>;
export type OrganizationLegalAcceptance = z.infer<
  typeof organizationLegalAcceptanceSchema
>;

export const updateOrganizationProfileSchema = z
  .object({
    legalName: z.string().trim().min(1),
    registrationNumber: z.string().trim().min(1),
    billingEmail: z.email(),
    responsibleName: z.string().trim().min(1),
    responsibleEmail: z.email(),
    responsiblePhone: z.string().trim().min(1).optional(),
    countryCode: countryCodeSchema,
    currency: currencyCodeSchema.default('SEK'),
  })
  .superRefine((value, context) => {
    if (!value.responsiblePhone) {
      return;
    }

    const normalized = normalizePhoneNumber(
      value.responsiblePhone,
      value.countryCode,
    );

    if (!normalized.ok) {
      context.addIssue({
        code: 'custom',
        message: 'Enter a valid responsible phone number.',
        path: ['responsiblePhone'],
      });
    }
  });

export const createCurrentOrganizationLegalAcceptanceSchema = z
  .object({})
  .strict();

export type OrganizationReadiness = {
  profileComplete: boolean;
  legalCurrent: boolean;
  setupComplete: boolean;
  legalUpdatesRequired: boolean;
  ready: boolean;
};

export type OrganizationWorkflowBlocker =
  | 'setup_required'
  | 'legal_update_required';

export type OrganizationEligibility = {
  contactImports: {
    allowed: boolean;
    blocker: OrganizationWorkflowBlocker | null;
  };
};

export type OrganizationSession = {
  user: User;
  organization: OrganizationContext;
  profile: OrganizationProfile | null;
  legalBundle: LegalBundle;
  legalAcceptance: OrganizationLegalAcceptance | null;
  eligibility: OrganizationEligibility;
  readiness: OrganizationReadiness;
};

export type UpdateOrganizationProfileInput = z.infer<
  typeof updateOrganizationProfileSchema
>;
export type UpdateOrganizationProfileResponse = {
  profile: OrganizationProfile | null;
};
export type CreateCurrentOrganizationLegalAcceptanceInput = z.infer<
  typeof createCurrentOrganizationLegalAcceptanceSchema
>;
export type CreateCurrentOrganizationLegalAcceptanceResponse = {
  legalAcceptance: OrganizationLegalAcceptance;
  eligibility: OrganizationEligibility;
  readiness: OrganizationReadiness;
};

export function canManageOrganizationSetup(role: string | null | undefined) {
  return role === 'org:admin' || role === 'org:owner';
}
