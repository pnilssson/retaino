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
  'processing',
  'completed',
  'failed',
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
] as const;

export type ContactImportStatus = (typeof CONTACT_IMPORT_STATUSES)[number];
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export type ContactIssueCode = (typeof CONTACT_ISSUE_CODES)[number];
export type ContactConsentStatus = (typeof CONTACT_CONSENT_STATUSES)[number];
export type SuppressionType = (typeof SUPPRESSION_TYPES)[number];
export type ContactImportTargetField =
  (typeof CONTACT_IMPORT_TARGET_FIELDS)[number];
export type IsoCountryCode = CountryCode;
export type ContactMethodError =
  | 'missing_contact_method'
  | 'invalid_phone'
  | 'invalid_email';

export type ContactMethodFacts = {
  phone: string | null;
  email: string | null;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
  phoneHash: string | null;
  emailHash: string | null;
  errors: ContactMethodError[];
};

export type ContactMethodIdentity = ContactMethodFacts & {
  dedupeKeys: string[];
};

export const contactImportStatusSchema = z.enum(CONTACT_IMPORT_STATUSES);
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
  consentStatus: contactConsentStatusSchema,
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

export const contactImportDetailSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  createdByUserId: idSchema,
  status: contactImportStatusSchema,
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
  startedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
  failedAt: timestampSchema.nullable(),
});

export const contactListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
  status: contactStatusSchema.optional(),
  issue: contactIssueCodeSchema.optional(),
  sort: z
    .enum(['createdAt', 'lastBookingAt', 'lastContactedAt', 'name'])
    .default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export const contactImportStartSchema = z.object({
  mapping: csvMappingSchema,
  phoneCountryCode: countryCodeSchema,
  permissionAttestation: z.literal(true, {
    error: 'Confirm these contacts can lawfully receive marketing SMS.',
  }),
});

export const createContactSchema = z
  .object({
    name: z.string().trim().min(1).nullable().optional().default(null),
    phone: nonEmptyStringSchema,
    phoneCountryCode: countryCodeSchema,
    email: z.email().nullable().optional().default(null),
    lastBookingAt: timestampSchema.nullable().optional().default(null),
    marketingSmsAllowed: z.boolean(),
  })
  .strict();

export const updateContactSchema = z
  .object({
    name: z.string().trim().min(1).nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    phoneCountryCode: countryCodeSchema.optional(),
    email: z.email().nullable().optional(),
    lastBookingAt: timestampSchema.nullable().optional(),
  })
  .strict();

export const createContactSuppressionSchema = z
  .object({
    type: suppressionTypeSchema,
  })
  .strict();

export const bulkContactIdsSchema = z
  .object({
    contactIds: z.array(idSchema).min(1).max(100),
  })
  .strict();

export const bulkSuppressContactsSchema = bulkContactIdsSchema
  .extend({
    type: z.literal('phone'),
  })
  .strict();

export type Contact = z.infer<typeof contactSchema>;
export type ContactSuppression = z.infer<typeof contactSuppressionSchema>;
export type ContactDetail = z.infer<typeof contactDetailSchema>;
export type ContactImportDetail = z.infer<typeof contactImportDetailSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export type ContactImportStartInput = z.infer<
  typeof contactImportStartSchema
>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateContactSuppressionInput = z.infer<
  typeof createContactSuppressionSchema
>;
export type BulkContactIdsInput = z.infer<typeof bulkContactIdsSchema>;
export type BulkSuppressContactsInput = z.infer<
  typeof bulkSuppressContactsSchema
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

export type CreateContactResponse = ContactDetailResponse;

export type CreateContactImportResponse = {
  import: ContactImportDetail;
};

export type ContactImportDetailResponse = {
  import: ContactImportDetail;
};

export type BulkContactActionResponse = {
  requestedCount: number;
  affectedCount: number;
  skippedCount: number;
};

export function autoMapContactImportHeaders(headers: string[]): CsvMapping {
  const mapping: CsvMapping = {};
  const phone = headers.find((header) => /phone|mobile|telefon/i.test(header));

  if (phone) {
    mapping.phone = phone;
  }

  for (const header of headers) {
    if (/name|namn/i.test(header)) mapping.name = header;
    if (/email|e-mail|epost/i.test(header)) mapping.email = header;
    if (/booking|last.*date|senaste/i.test(header)) mapping.lastBookingAt = header;
  }

  return mapping;
}

export function contactImportMappingReady(mapping: CsvMapping) {
  return Boolean(mapping.phone || mapping.email);
}

export function contactImportMappedFieldEntries(mapping: CsvMapping) {
  return CONTACT_IMPORT_TARGET_FIELDS.flatMap((target) => {
    const header = mapping[target];

    return header ? [{ target, header }] : [];
  });
}

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

export async function prepareContactMethodIdentity(input: {
  phone: string | null | undefined;
  email: string | null | undefined;
  phoneCountryCode: string;
  requireContactMethod?: boolean;
}): Promise<ContactMethodIdentity> {
  const phone = cleanContactMethodValue(input.phone);
  const email = cleanContactMethodValue(input.email);
  const normalizedPhone = phone
    ? normalizePhoneNumber(phone, input.phoneCountryCode)
    : null;
  const normalizedEmail = email ? normalizeEmail(email) : null;
  const errors: ContactMethodError[] = [];

  if (input.requireContactMethod && !phone && !email) {
    errors.push('missing_contact_method');
  }

  if (normalizedPhone && !normalizedPhone.ok) {
    errors.push(
      normalizedPhone.error === 'missing_phone'
        ? 'missing_contact_method'
        : normalizedPhone.error,
    );
  }

  if (email && !normalizedEmail) {
    errors.push('invalid_email');
  }

  const normalizedPhoneValue =
    normalizedPhone && normalizedPhone.ok ? normalizedPhone.normalizedPhone : null;

  const identity: ContactMethodFacts = {
    phone,
    email,
    normalizedPhone: normalizedPhoneValue,
    normalizedEmail,
    phoneHash: normalizedPhoneValue
      ? await hashContactValue(normalizedPhoneValue)
      : null,
    emailHash: normalizedEmail ? await hashContactValue(normalizedEmail) : null,
    errors,
  };

  return {
    ...identity,
    dedupeKeys: contactMethodDedupeKeys(identity),
  };
}

export async function prepareContactMethods(input: {
  phone: string | null | undefined;
  email: string | null | undefined;
  phoneCountryCode: string;
  requireContactMethod?: boolean;
}): Promise<ContactMethodFacts> {
  const identity = await prepareContactMethodIdentity(input);

  return {
    email: identity.email,
    emailHash: identity.emailHash,
    errors: identity.errors,
    normalizedEmail: identity.normalizedEmail,
    normalizedPhone: identity.normalizedPhone,
    phone: identity.phone,
    phoneHash: identity.phoneHash,
  };
}

export function contactMethodDedupeKeys(input: {
  phoneHash: string | null;
  emailHash: string | null;
}) {
  return [
    input.phoneHash ? `phone:${input.phoneHash}` : null,
    input.emailHash ? `email:${input.emailHash}` : null,
  ].filter((key): key is string => key !== null);
}

function cleanContactMethodValue(value: string | null | undefined) {
  const input = value?.trim();

  return input ? input : null;
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
