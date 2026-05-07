import type { LegalDocumentVersionSummary } from '@retaino/shared/contracts';

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
  requiredLegalDocuments: readonly RequiredLegalDocumentForReadiness[];
  acceptedDocuments: readonly AcceptedComplianceDocument[];
}) {
  const accepted = new Set(
    input.acceptedDocuments.map(
      (document) => `${document.documentType}:${document.documentVersion}`,
    ),
  );
  const missingAcceptanceTypes = input.requiredLegalDocuments
    .filter(
      (document) =>
        !accepted.has(`${document.documentType}:${document.documentVersion}`),
    )
    .map((document) => document.documentType);
  const complianceComplete = missingAcceptanceTypes.length === 0;

  return {
    profileComplete: input.hasProfile,
    complianceComplete,
    ready: input.hasProfile && complianceComplete,
    missingAcceptanceTypes,
  };
}
