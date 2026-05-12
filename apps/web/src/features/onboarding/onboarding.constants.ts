import type { LegalBundleDocumentType } from '@retaino/shared/contracts';

export type { LegalBundleDocumentType };

export const legalBundleDocumentLabels: Record<LegalBundleDocumentType, string> = {
  terms: 'Terms and Conditions',
  dpa: 'Data Processing Agreement',
  subprocessors: 'Subprocessor Notice',
  transfer_terms: 'Transfer Terms',
  sending_policy: 'Sending Policy',
};

export const legalBundleDocumentDescriptions: Record<
  LegalBundleDocumentType,
  string
> = {
  terms: 'The commercial terms for using Retaino.',
  dpa: 'The processor terms for customer and campaign data.',
  subprocessors: 'The vendors Retaino uses to operate the service.',
  transfer_terms: 'The terms that cover vendors outside the EU or EEA.',
  sending_policy: 'Rules for responsible SMS marketing and opt-out handling.',
};
