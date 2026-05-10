import type {
  LegalDocumentVersionSummary,
  OrganizationReadiness,
} from '@retaino/shared/contracts';
import { requiredLegalDocumentTypeSchema } from '@retaino/shared/contracts';

export type RequiredLegalDocumentForReadiness = Pick<
  LegalDocumentVersionSummary,
  'documentType' | 'documentVersion'
>;

type AcceptedComplianceDocument = {
  documentType: string;
  documentVersion: string;
};

export function getOrganizationReadiness(input: {
  hasProfile: boolean;
  onboardingStatus: string;
  requiredLegalDocuments: readonly RequiredLegalDocumentForReadiness[];
  acceptedDocuments: readonly AcceptedComplianceDocument[];
}): OrganizationReadiness {
  const accepted = new Set(
    input.acceptedDocuments.map(
      (document) => `${document.documentType}:${document.documentVersion}`,
    ),
  );
  const missingAcceptanceTypes = input.requiredLegalDocuments.flatMap(
    (document) => {
      const documentType = requiredLegalDocumentTypeSchema.safeParse(
        document.documentType,
      );

      if (
        !documentType.success ||
        accepted.has(`${document.documentType}:${document.documentVersion}`)
      ) {
        return [];
      }

      return [documentType.data];
    },
  );
  const complianceComplete = missingAcceptanceTypes.length === 0;
  const setupComplete = input.onboardingStatus === 'complete';
  const legalUpdatesRequired = setupComplete && !complianceComplete;

  return {
    profileComplete: input.hasProfile,
    complianceComplete,
    setupComplete,
    legalUpdatesRequired,
    ready: setupComplete && complianceComplete,
    missingAcceptanceTypes,
  };
}
