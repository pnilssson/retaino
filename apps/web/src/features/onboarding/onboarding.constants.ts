import type { ComplianceDocumentType } from '@retaino/shared/contracts';

export type { ComplianceDocumentType };

export const complianceDocumentLabels: Record<ComplianceDocumentType, string> = {
  terms: 'Terms and Conditions',
  dpa: 'Data Processing Agreement',
  subprocessors: 'Subprocessor Notice',
  transfer_terms: 'Transfer Terms',
  sending_policy: 'Sending Policy',
  campaign_attestation: 'SMS Marketing Attestation'
};

export const complianceDocumentDescriptions: Record<
  ComplianceDocumentType,
  string
> = {
  terms: 'The commercial terms for using Retaino.',
  dpa: 'The processor terms for customer and campaign data.',
  subprocessors: 'The vendors Retaino uses to operate the service.',
  transfer_terms: 'The terms that cover vendors outside the EU or EEA.',
  sending_policy: 'Rules for responsible SMS marketing and opt-out handling.',
  campaign_attestation:
    'Confirmation that campaigns target valid customer contacts.'
};
