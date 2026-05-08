import { z } from 'zod';
import { idSchema, nonEmptyStringSchema, timestampSchema } from '../schemas';

export const LEGAL_DOCUMENT_TYPES = [
  'terms',
  'privacy',
  'cookies',
  'dpa',
  'subprocessors',
  'transfer_terms',
  'sending_policy',
  'campaign_attestation',
] as const;

export const REQUIRED_LEGAL_DOCUMENT_TYPES = [
  'terms',
  'dpa',
  'subprocessors',
  'transfer_terms',
  'sending_policy',
  'campaign_attestation',
] as const;

export const REQUIRED_COMPLIANCE_DOCUMENT_TYPES = REQUIRED_LEGAL_DOCUMENT_TYPES;

export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];
export type RequiredLegalDocumentType =
  (typeof REQUIRED_LEGAL_DOCUMENT_TYPES)[number];
export type ComplianceDocumentType = RequiredLegalDocumentType;

export const legalDocumentTypeSchema = z.enum(LEGAL_DOCUMENT_TYPES);
export const requiredLegalDocumentTypeSchema = z.enum(
  REQUIRED_LEGAL_DOCUMENT_TYPES,
);

export const legalDocumentVersionSchema = z.object({
  id: idSchema,
  legalDocumentId: idSchema,
  documentType: legalDocumentTypeSchema,
  slug: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  documentVersion: nonEmptyStringSchema,
  effectiveDate: nonEmptyStringSchema,
  bodyMdx: nonEmptyStringSchema,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  publicVisible: z.boolean(),
  acceptanceRequired: z.boolean(),
  sortOrder: z.number().int(),
  publishedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const legalDocumentVersionSummarySchema =
  legalDocumentVersionSchema.omit({
    bodyMdx: true,
  });

export type LegalDocumentVersion = z.infer<
  typeof legalDocumentVersionSchema
>;
export type LegalDocumentVersionSummary = z.infer<
  typeof legalDocumentVersionSummarySchema
>;

export function legalDocumentUrl(input: {
  documentType?: string;
  documentVersion?: string;
  type?: string;
  version?: string;
}) {
  const documentType = input.documentType ?? input.type;
  const documentVersion = input.documentVersion ?? input.version;

  return `/legal/${documentType}/${documentVersion}`;
}

export function appLegalDocumentUrl(input: {
  documentType?: string;
  documentVersion?: string;
  type?: string;
  version?: string;
}) {
  const documentType = input.documentType ?? input.type;
  const documentVersion = input.documentVersion ?? input.version;

  return `/app/legal/${documentType}/${documentVersion}`;
}

export const userSchema = z.object({
  id: idSchema,
  clerkUserId: nonEmptyStringSchema,
  email: z.email().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

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

export type User = z.infer<typeof userSchema>;
export type OrganizationContext = z.infer<typeof organizationContextSchema>;
export type OrganizationProfile = z.infer<typeof organizationProfileSchema>;
export type OrganizationAcceptance = z.infer<typeof organizationAcceptanceSchema>;

export const updateOrganizationProfileSchema = z.object({
  legalName: z.string().trim().min(1),
  registrationNumber: z.string().trim().min(1),
  billingEmail: z.email(),
  responsibleName: z.string().trim().min(1),
  responsibleEmail: z.email(),
  responsiblePhone: z.string().trim().min(1).optional(),
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
