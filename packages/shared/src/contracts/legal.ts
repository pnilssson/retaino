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
] as const;

export const LEGAL_BUNDLE_VERSION = '2026-05-14' as const;

export const REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES =
  REQUIRED_LEGAL_DOCUMENT_TYPES;

export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];
export type RequiredLegalDocumentType =
  (typeof REQUIRED_LEGAL_DOCUMENT_TYPES)[number];
export type LegalBundleDocumentType =
  (typeof REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES)[number];

export const legalDocumentTypeSchema = z.enum(LEGAL_DOCUMENT_TYPES);
export const requiredLegalDocumentTypeSchema = z.enum(
  REQUIRED_LEGAL_DOCUMENT_TYPES,
);
export const legalBundleDocumentTypeSchema = z.enum(
  REQUIRED_LEGAL_BUNDLE_DOCUMENT_TYPES,
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

export const legalBundleDocumentSnapshotSchema =
  legalDocumentVersionSummarySchema.pick({
    id: true,
    legalDocumentId: true,
    documentType: true,
    slug: true,
    title: true,
    documentVersion: true,
    effectiveDate: true,
    contentHash: true,
    publicVisible: true,
    acceptanceRequired: true,
    sortOrder: true,
    publishedAt: true,
  });

export const legalBundleSchema = z.object({
  version: nonEmptyStringSchema,
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  documents: z.array(legalBundleDocumentSnapshotSchema),
});

export type LegalDocumentVersion = z.infer<
  typeof legalDocumentVersionSchema
>;
export type LegalDocumentVersionSummary = z.infer<
  typeof legalDocumentVersionSummarySchema
>;
export type LegalBundleDocumentSnapshot = z.infer<
  typeof legalBundleDocumentSnapshotSchema
>;
export type LegalBundle = z.infer<typeof legalBundleSchema>;

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
