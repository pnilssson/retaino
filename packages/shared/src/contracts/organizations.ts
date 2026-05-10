import { z } from 'zod';

import { idSchema, nonEmptyStringSchema, timestampSchema } from '../schemas';
import {
  REQUIRED_LEGAL_DOCUMENT_TYPES,
  type ComplianceDocumentType,
  type LegalDocumentVersionSummary,
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
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const organizationAcceptanceSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  userId: idSchema,
  legalDocumentVersionId: idSchema,
  documentType: nonEmptyStringSchema,
  documentVersion: nonEmptyStringSchema,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  ipAddress: nonEmptyStringSchema.nullable(),
  userAgent: nonEmptyStringSchema.nullable(),
  acceptedAt: timestampSchema,
});

export type OrganizationContext = z.infer<typeof organizationContextSchema>;
export type OrganizationProfile = z.infer<typeof organizationProfileSchema>;
export type OrganizationAcceptance = z.infer<
  typeof organizationAcceptanceSchema
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

export const createOrganizationAcceptanceSchema = z.object({
  documentType: z.enum(REQUIRED_LEGAL_DOCUMENT_TYPES),
  documentVersion: z.string().trim().min(1),
});

export const createCurrentOrganizationAcceptancesSchema = z.object({
  documents: z
    .array(createOrganizationAcceptanceSchema)
    .min(1, 'At least one legal document is required.'),
});

export type OrganizationReadiness = {
  profileComplete: boolean;
  complianceComplete: boolean;
  setupComplete: boolean;
  legalUpdatesRequired: boolean;
  ready: boolean;
  missingAcceptanceTypes: ComplianceDocumentType[];
};

export type OrganizationSession = {
  user: User;
  organization: OrganizationContext;
  profile: OrganizationProfile | null;
  acceptedDocuments: Pick<
    OrganizationAcceptance,
    'documentType' | 'documentVersion' | 'legalDocumentVersionId' | 'contentHash'
  >[];
  requiredLegalDocuments: LegalDocumentVersionSummary[];
  readiness: OrganizationReadiness;
};

export type UpdateOrganizationProfileInput = z.infer<
  typeof updateOrganizationProfileSchema
>;
export type CreateOrganizationAcceptanceInput = z.infer<
  typeof createOrganizationAcceptanceSchema
>;
export type UpdateOrganizationProfileResponse = {
  profile: OrganizationProfile | null;
};
export type CreateCurrentOrganizationAcceptancesInput = z.infer<
  typeof createCurrentOrganizationAcceptancesSchema
>;
export type CreateCurrentOrganizationAcceptancesResponse = {
  acceptedDocuments: OrganizationSession['acceptedDocuments'];
  readiness: OrganizationReadiness;
};

export function canManageOrganizationSetup(role: string | null | undefined) {
  return role === 'org:admin' || role === 'org:owner';
}
