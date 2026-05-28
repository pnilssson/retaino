import type { LegalDocumentType } from '@retaino/shared/contracts';

export type LegalDocumentManifestEntry = {
  documentType: LegalDocumentType;
  slug: string;
  title: string;
  version: string;
  path: string;
  effectiveDate: string;
  publicVisible: boolean;
  acceptanceRequired: boolean;
  sortOrder: number;
};

export const legalDocuments = [
  {
    documentType: 'terms',
    slug: 'terms',
    title: 'Retaino Terms and Conditions',
    version: '2026-05-05',
    path: 'terms/2026-05-05.mdx',
    effectiveDate: '2026-05-05',
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 10,
  },
  {
    documentType: 'privacy',
    slug: 'privacy',
    title: 'Retaino Privacy Policy',
    version: '2026-05-28',
    path: 'privacy/2026-05-28.mdx',
    effectiveDate: '2026-05-28',
    publicVisible: true,
    acceptanceRequired: false,
    sortOrder: 20,
  },
  {
    documentType: 'cookies',
    slug: 'cookies',
    title: 'Retaino Cookie Policy',
    version: '2026-05-28',
    path: 'cookies/2026-05-28.mdx',
    effectiveDate: '2026-05-28',
    publicVisible: true,
    acceptanceRequired: false,
    sortOrder: 30,
  },
  {
    documentType: 'dpa',
    slug: 'dpa',
    title: 'Retaino Data Processing Agreement',
    version: '2026-05-09',
    path: 'dpa/2026-05-09.mdx',
    effectiveDate: '2026-05-09',
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 40,
  },
  {
    documentType: 'subprocessors',
    slug: 'subprocessors',
    title: 'Retaino Subprocessor Notice',
    version: '2026-05-14',
    path: 'subprocessors/2026-05-14.mdx',
    effectiveDate: '2026-05-14',
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 50,
  },
  {
    documentType: 'transfer_terms',
    slug: 'transfer_terms',
    title: 'Retaino Transfer Terms',
    version: '2026-05-09',
    path: 'transfer_terms/2026-05-09.mdx',
    effectiveDate: '2026-05-09',
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 60,
  },
  {
    documentType: 'sending_policy',
    slug: 'sending_policy',
    title: 'Retaino Sending Policy',
    version: '2026-05-09',
    path: 'sending_policy/2026-05-09.mdx',
    effectiveDate: '2026-05-09',
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: 70,
  },
  {
    documentType: 'campaign_attestation',
    slug: 'campaign_attestation',
    title: 'Retaino SMS Marketing Attestation',
    version: '2026-05-09',
    path: 'campaign_attestation/2026-05-09.mdx',
    effectiveDate: '2026-05-09',
    publicVisible: true,
    acceptanceRequired: false,
    sortOrder: 80,
  },
] as const satisfies LegalDocumentManifestEntry[];
