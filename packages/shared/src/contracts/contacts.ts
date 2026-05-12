import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { z } from 'zod';
import { idSchema, nonEmptyStringSchema, timestampSchema } from '../schemas';

export const DEFAULT_COUNTRY_CODE = 'SE';
export const SUPPORTED_COUNTRY_CODES = getCountries().sort();
export const countryCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => SUPPORTED_COUNTRY_CODES.includes(value as CountryCode), {
    message: 'Choose a supported country.',
  });

export const CONTACT_IMPORT_STATUSES = [
  'uploaded',
  'mapped',
  'processing',
  'completed',
  'failed',
  'canceled',
] as const;

export const CONTACT_IMPORT_ROW_STATUSES = [
  'created',
  'updated',
  'duplicate',
  'invalid',
  'suppressed',
  'skipped',
] as const;

export const CONTACT_STATUSES = ['ready', 'blocked', 'incomplete'] as const;

export const CONTACT_ISSUE_CODES = [
  'missing_phone',
  'invalid_phone',
  'suppressed_phone',
  'missing_consent',
] as const;

export const CONTACT_CONSENT_STATUSES = [
  'granted',
  'unknown',
  'denied',
] as const;

export const SUPPRESSION_TYPES = ['phone', 'email'] as const;

export const CONTACT_IMPORT_TARGET_FIELDS = [
  'name',
  'phone',
  'email',
  'lastBookingAt',
  'lastService',
  'consentStatus',
  'source',
] as const;

export type ContactImportStatus = (typeof CONTACT_IMPORT_STATUSES)[number];
export type ContactImportRowStatus =
  (typeof CONTACT_IMPORT_ROW_STATUSES)[number];
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export type ContactIssueCode = (typeof CONTACT_ISSUE_CODES)[number];
export type ContactConsentStatus = (typeof CONTACT_CONSENT_STATUSES)[number];
export type SuppressionType = (typeof SUPPRESSION_TYPES)[number];
export type ContactImportTargetField =
  (typeof CONTACT_IMPORT_TARGET_FIELDS)[number];
export type IsoCountryCode = CountryCode;

export const contactImportStatusSchema = z.enum(CONTACT_IMPORT_STATUSES);
export const contactImportRowStatusSchema = z.enum(
  CONTACT_IMPORT_ROW_STATUSES,
);
export const contactStatusSchema = z.enum(CONTACT_STATUSES);
export const contactIssueCodeSchema = z.enum(CONTACT_ISSUE_CODES);
export const contactConsentStatusSchema = z.enum(CONTACT_CONSENT_STATUSES);
export const suppressionTypeSchema = z.enum(SUPPRESSION_TYPES);
export const contactImportTargetFieldSchema = z.enum(
  CONTACT_IMPORT_TARGET_FIELDS,
);

export const csvMappingSchema = z
  .object(
    Object.fromEntries(
      CONTACT_IMPORT_TARGET_FIELDS.map((field) => [
        field,
        z.string().trim().min(1).optional(),
      ]),
    ) as Record<ContactImportTargetField, z.ZodOptional<z.ZodString>>,
  )
  .strict()
  .refine((mapping) => Boolean(mapping.phone || mapping.email), {
    message: 'Map at least one contact method.',
  });

export const contactSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  name: nonEmptyStringSchema.nullable(),
  phone: nonEmptyStringSchema.nullable(),
  email: z.email().nullable(),
  normalizedPhone: nonEmptyStringSchema.nullable(),
  normalizedEmail: z.email().nullable(),
  lastBookingAt: timestampSchema.nullable(),
  lastContactedAt: timestampSchema.nullable(),
  lastService: nonEmptyStringSchema.nullable(),
  consentStatus: contactConsentStatusSchema,
  source: nonEmptyStringSchema.nullable(),
  createdFromImportId: idSchema.nullable(),
  lastImportId: idSchema.nullable(),
  contactStatus: contactStatusSchema,
  contactIssues: z.array(contactIssueCodeSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const contactSuppressionSchema = z.object({
  id: idSchema,
  type: suppressionTypeSchema,
  value: nonEmptyStringSchema,
  reason: nonEmptyStringSchema,
  source: nonEmptyStringSchema.nullable(),
  createdAt: timestampSchema,
});

export const contactDetailSchema = contactSchema.extend({
  suppressions: z.array(contactSuppressionSchema),
});

export const contactImportSummarySchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  createdByUserId: idSchema,
  status: contactImportStatusSchema,
  filename: nonEmptyStringSchema,
  fileSize: z.number().int().nonnegative(),
  contentType: nonEmptyStringSchema,
  source: nonEmptyStringSchema.nullable(),
  phoneCountryCode: countryCodeSchema,
  totalRows: z.number().int().nonnegative(),
  processedRows: z.number().int().nonnegative(),
  createdCount: z.number().int().nonnegative(),
  updatedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  invalidCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  suppressedCount: z.number().int().nonnegative(),
  errorSummary: z.array(nonEmptyStringSchema),
  permissionAttestedAt: timestampSchema.nullable(),
  permissionAttestedByUserId: idSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
  failedAt: timestampSchema.nullable(),
});

export const contactImportPreviewSchema = z.object({
  headers: z.array(nonEmptyStringSchema),
  sampleRows: z.array(z.record(z.string(), z.string())),
  warnings: z.array(nonEmptyStringSchema),
});

export const contactImportDetailSchema = contactImportSummarySchema.extend({
  mapping: csvMappingSchema.nullable(),
  preview: contactImportPreviewSchema.nullable(),
});

export const contactImportRowSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  contactImportId: idSchema,
  rowNumber: z.number().int().positive(),
  status: contactImportRowStatusSchema,
  contactId: idSchema.nullable(),
  rawValues: z.record(z.string(), z.string()),
  normalizedValues: z.record(z.string(), z.string().nullable()),
  errors: z.array(nonEmptyStringSchema),
  createdAt: timestampSchema,
});

export const contactListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
  status: contactStatusSchema.optional(),
  issue: contactIssueCodeSchema.optional(),
  importedFrom: idSchema.optional(),
  sort: z
    .enum(['createdAt', 'lastBookingAt', 'lastContactedAt', 'name'])
    .default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export const contactImportListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: contactImportStatusSchema.optional(),
});

export const contactImportRowsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: contactImportRowStatusSchema.optional(),
});

export const contactImportProcessSchema = z.object({
  mapping: csvMappingSchema,
  phoneCountryCode: countryCodeSchema,
  permissionAttestation: z.literal(true, {
    error: 'Confirm these contacts can lawfully receive marketing SMS.',
  }),
});

export const updateContactSchema = z
  .object({
    name: z.string().trim().min(1).nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    phoneCountryCode: countryCodeSchema.optional(),
    email: z.email().nullable().optional(),
    lastBookingAt: timestampSchema.nullable().optional(),
    lastService: z.string().trim().min(1).nullable().optional(),
    source: z.string().trim().min(1).nullable().optional(),
    consentStatus: contactConsentStatusSchema.optional(),
  })
  .strict();

export const createContactSuppressionSchema = z
  .object({
    type: suppressionTypeSchema,
  })
  .strict();

export type Contact = z.infer<typeof contactSchema>;
export type ContactSuppression = z.infer<typeof contactSuppressionSchema>;
export type ContactDetail = z.infer<typeof contactDetailSchema>;
export type ContactImportSummary = z.infer<typeof contactImportSummarySchema>;
export type ContactImportPreview = z.infer<typeof contactImportPreviewSchema>;
export type ContactImportDetail = z.infer<typeof contactImportDetailSchema>;
export type ContactImportRow = z.infer<typeof contactImportRowSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export type ContactImportListQuery = z.infer<
  typeof contactImportListQuerySchema
>;
export type ContactImportRowsQuery = z.infer<
  typeof contactImportRowsQuerySchema
>;
export type ContactImportProcessInput = z.infer<
  typeof contactImportProcessSchema
>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateContactSuppressionInput = z.infer<
  typeof createContactSuppressionSchema
>;
export type CsvMapping = z.infer<typeof csvMappingSchema>;

export type ContactListResponse = {
  contacts: Contact[];
  page: number;
  pageSize: number;
  total: number;
};

export type ContactDetailResponse = {
  contact: ContactDetail;
};

export type ContactImportListResponse = {
  imports: ContactImportSummary[];
  page: number;
  pageSize: number;
  total: number;
};

export type ContactImportRowsResponse = {
  rows: ContactImportRow[];
  page: number;
  pageSize: number;
  total: number;
};

export type CreateContactImportResponse = {
  import: ContactImportDetail;
  preview: ContactImportPreview;
};

export type ContactImportProcessResponse = {
  import: ContactImportDetail;
};

export function normalizePhoneNumber(
  value: string | null | undefined,
  defaultCountryCode: string,
):
  | { ok: true; normalizedPhone: string }
  | { ok: false; error: 'missing_phone' | 'invalid_phone' } {
  const input = value?.trim();

  if (!input) {
    return { ok: false, error: 'missing_phone' };
  }

  const parsed = parsePhoneNumberFromString(
    input,
    defaultCountryCode as CountryCode,
  );

  if (!parsed || (!parsed.isValid() && !parsed.isPossible())) {
    return { ok: false, error: 'invalid_phone' };
  }

  return { ok: true, normalizedPhone: parsed.number };
}

export function isSupportedCountryCode(value: string): value is IsoCountryCode {
  return SUPPORTED_COUNTRY_CODES.includes(value as IsoCountryCode);
}

export function getPhoneCountryCallingCode(countryCode: string) {
  return isSupportedCountryCode(countryCode)
    ? getCountryCallingCode(countryCode)
    : null;
}

export function getCountryDisplayName(
  countryCode: string,
  locale = 'en',
) {
  if (!isSupportedCountryCode(countryCode)) {
    return countryCode;
  }

  try {
    return (
      new Intl.DisplayNames([locale], { type: 'region' }).of(countryCode) ??
      countryCode
    );
  } catch {
    return countryCode;
  }
}

export function getSupportedPhoneCountries(locale = 'en') {
  return SUPPORTED_COUNTRY_CODES.map((code) => ({
    code,
    callingCode: getCountryCallingCode(code),
    name: getCountryDisplayName(code, locale),
  })).sort((left, right) => left.name.localeCompare(right.name, locale));
}

export function formatPhoneCountryLabel(
  countryCode: string,
  locale = 'en',
) {
  const callingCode = getPhoneCountryCallingCode(countryCode);

  return callingCode
    ? `${getCountryDisplayName(countryCode, locale)} +${callingCode}`
    : countryCode;
}

export function normalizeEmail(value: string | null | undefined) {
  const input = value?.trim().toLowerCase();

  if (!input) {
    return null;
  }

  const parsed = z.email().safeParse(input);
  return parsed.success ? parsed.data : null;
}

export async function hashContactValue(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function deriveSmsContactStatus(input: {
  normalizedPhone: string | null;
  consentStatus: ContactConsentStatus;
  suppressed: boolean;
}): { contactStatus: ContactStatus; contactIssues: ContactIssueCode[] } {
  const contactIssues: ContactIssueCode[] = [];

  if (!input.normalizedPhone) {
    contactIssues.push('missing_phone');
  }

  if (input.suppressed) {
    contactIssues.push('suppressed_phone');
  }

  if (input.consentStatus !== 'granted') {
    contactIssues.push('missing_consent');
  }

  const contactStatus = !input.normalizedPhone
    ? 'incomplete'
    : contactIssues.length > 0
      ? 'blocked'
      : 'ready';

  return { contactStatus, contactIssues };
}
