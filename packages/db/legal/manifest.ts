import { LOCALES, type Locale } from '@retaino/shared';
import type { LegalDocumentType } from '@retaino/shared/contracts';

const CURRENT_LEGAL_DOCUMENT_VERSION = '2026-06-21';

export type LegalDocumentManifestEntry = {
  documentType: LegalDocumentType;
  locale: Locale;
  slug: string;
  title: string;
  version: string;
  path: string;
  effectiveDate: string;
  publicVisible: boolean;
  acceptanceRequired: boolean;
  sortOrder: number;
};

type LegalDocumentDefinition = Omit<
  LegalDocumentManifestEntry,
  'locale' | 'path' | 'title'
> & {
  titles: Record<Locale, string>;
};

const definitions = [
  {
    documentType: 'terms',
    slug: 'terms',
    titles: {
      en: 'Retaino Terms and Conditions',
      sv: 'Retaino allmänna villkor',
    },
    version: CURRENT_LEGAL_DOCUMENT_VERSION,
    effectiveDate: CURRENT_LEGAL_DOCUMENT_VERSION,
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 10,
  },
  {
    documentType: 'privacy',
    slug: 'privacy',
    titles: {
      en: 'Retaino Privacy Policy',
      sv: 'Retaino integritetspolicy',
    },
    version: CURRENT_LEGAL_DOCUMENT_VERSION,
    effectiveDate: CURRENT_LEGAL_DOCUMENT_VERSION,
    publicVisible: true,
    acceptanceRequired: false,
    sortOrder: 20,
  },
  {
    documentType: 'cookies',
    slug: 'cookies',
    titles: {
      en: 'Retaino Cookie Policy',
      sv: 'Retaino cookiepolicy',
    },
    version: CURRENT_LEGAL_DOCUMENT_VERSION,
    effectiveDate: CURRENT_LEGAL_DOCUMENT_VERSION,
    publicVisible: true,
    acceptanceRequired: false,
    sortOrder: 30,
  },
  {
    documentType: 'dpa',
    slug: 'dpa',
    titles: {
      en: 'Retaino Data Processing Agreement',
      sv: 'Retaino personuppgiftsbiträdesavtal',
    },
    version: CURRENT_LEGAL_DOCUMENT_VERSION,
    effectiveDate: CURRENT_LEGAL_DOCUMENT_VERSION,
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 40,
  },
  {
    documentType: 'subprocessors',
    slug: 'subprocessors',
    titles: {
      en: 'Retaino Subprocessor Notice',
      sv: 'Retaino underbiträdesinformation',
    },
    version: CURRENT_LEGAL_DOCUMENT_VERSION,
    effectiveDate: CURRENT_LEGAL_DOCUMENT_VERSION,
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 50,
  },
  {
    documentType: 'transfer_terms',
    slug: 'transfer_terms',
    titles: {
      en: 'Retaino Transfer Terms',
      sv: 'Retaino överföringsvillkor',
    },
    version: CURRENT_LEGAL_DOCUMENT_VERSION,
    effectiveDate: CURRENT_LEGAL_DOCUMENT_VERSION,
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 60,
  },
  {
    documentType: 'sending_policy',
    slug: 'sending_policy',
    titles: {
      en: 'Retaino Sending Policy',
      sv: 'Retaino utskickspolicy',
    },
    version: CURRENT_LEGAL_DOCUMENT_VERSION,
    effectiveDate: CURRENT_LEGAL_DOCUMENT_VERSION,
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 70,
  },
  {
    documentType: 'campaign_attestation',
    slug: 'campaign_attestation',
    titles: {
      en: 'Retaino SMS Marketing Attestation',
      sv: 'Retaino intyg för SMS-marknadsföring',
    },
    version: CURRENT_LEGAL_DOCUMENT_VERSION,
    effectiveDate: CURRENT_LEGAL_DOCUMENT_VERSION,
    publicVisible: true,
    acceptanceRequired: false,
    sortOrder: 80,
  },
  {
    documentType: 'customer_privacy_notice_guide',
    slug: 'customer_privacy_notice_guide',
    titles: {
      en: 'Retaino Customer Privacy Notice Guide',
      sv: 'Retaino guide för kunders integritetsinformation',
    },
    version: CURRENT_LEGAL_DOCUMENT_VERSION,
    effectiveDate: CURRENT_LEGAL_DOCUMENT_VERSION,
    publicVisible: true,
    acceptanceRequired: false,
    sortOrder: 90,
  },
] as const satisfies LegalDocumentDefinition[];

export const legalDocuments = definitions.flatMap((document) =>
  LOCALES.map((locale) => ({
    ...document,
    locale,
    title: document.titles[locale],
    path: `${document.documentType}/${locale}/${document.version}.mdx`,
  })),
) satisfies LegalDocumentManifestEntry[];
