import type {
  ComplianceDocumentType,
  LegalDocumentVersionSummary,
  OrganizationAcceptance,
  OrganizationContext,
  OrganizationProfile,
  User
} from '@retaino/shared/contracts';

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

export type UpdateOrganizationProfileInput = {
  legalName: string;
  registrationNumber: string;
  billingEmail: string;
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone?: string | undefined;
};

export type CreateOrganizationAcceptanceInput = {
  documentType: ComplianceDocumentType;
  documentVersion: string;
};

export type UpdateOrganizationProfileResponse = {
  profile: OrganizationProfile | null;
};

export type CreateOrganizationAcceptanceResponse = {
  acceptance: OrganizationAcceptance | null;
};

export type CreateCurrentOrganizationAcceptancesInput = {
  documents: CreateOrganizationAcceptanceInput[];
};

export type CreateCurrentOrganizationAcceptancesResponse = {
  acceptedDocuments: OrganizationSession['acceptedDocuments'];
  readiness: OrganizationReadiness;
};
