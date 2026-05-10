import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  not,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  deriveSmsContactStatus,
  type Contact,
  type ContactConsentStatus,
  type ContactDetail,
  type ContactImportDetail,
  type ContactImportPreview,
  type ContactImportRow,
  type ContactImportRowStatus,
  type ContactImportStatus,
  type ContactImportSummary,
  type ContactListQuery,
  type ContactListResponse,
  type ContactImportListQuery,
  type ContactImportListResponse,
  type ContactImportRowsQuery,
  type ContactImportRowsResponse,
  type ContactSuppression,
  type CsvMapping,
  type SuppressionType,
  type UpdateContactInput,
  hashContactValue,
  normalizeEmail,
  normalizePhoneNumber,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import {
  contactImportRows,
  contactImports,
  contacts,
  organizationProfiles,
  suppressions,
} from '../schema';

type ContactRow = typeof contacts.$inferSelect;
type ContactImportDbRow = typeof contactImports.$inferSelect;
type ImportResultRow = typeof contactImportRows.$inferSelect;
type SuppressionRow = typeof suppressions.$inferSelect;

export type MarkContactImportProcessingResult =
  | { status: 'updated'; import: ContactImportDetail }
  | { status: 'not_found' }
  | { status: 'invalid_status'; import: ContactImportDetail };

export type ContactImportProcessingRecord = {
  id: string;
  organizationId: string;
  status: ContactImportStatus;
  fileKey: string;
  mapping: CsvMapping | null;
  phoneCountryCode: string;
};

export type UpdateContactResult =
  | { status: 'updated'; contact: ContactDetail }
  | { status: 'not_found' }
  | { status: 'invalid_phone' }
  | { status: 'invalid_email' }
  | { status: 'duplicate' };

export type CreateContactSuppressionResult =
  | { status: 'created' | 'existing'; contact: ContactDetail }
  | { status: 'not_found' }
  | { status: 'missing_method' };

export type DeleteContactSuppressionResult =
  | { status: 'deleted'; contact: ContactDetail }
  | { status: 'not_found' };

export function assertOrganizationId(organizationId: string) {
  if (!organizationId.trim()) {
    throw new Error('organizationId is required');
  }
}

export function contactToContract(
  row: ContactRow,
  input: { suppressed: boolean },
): Contact {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    phone: row.phone,
    email: row.email,
    normalizedPhone: row.normalizedPhone,
    normalizedEmail: row.normalizedEmail,
    lastBookingAt: row.lastBookingAt?.toISOString() ?? null,
    lastContactedAt: row.lastContactedAt?.toISOString() ?? null,
    lastService: row.lastService,
    consentStatus: row.consentStatus as ContactConsentStatus,
    source: row.source,
    createdFromImportId: row.createdFromImportId,
    lastImportId: row.lastImportId,
    ...deriveSmsContactStatus({
      normalizedPhone: row.normalizedPhone,
      consentStatus: row.consentStatus as ContactConsentStatus,
      suppressed: input.suppressed,
    }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function suppressionToContract(row: SuppressionRow): ContactSuppression {
  return {
    id: row.id,
    type: row.type as SuppressionType,
    value: row.value,
    reason: row.reason,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

export function contactDetailToContract(
  row: ContactRow,
  suppressionRows: SuppressionRow[],
): ContactDetail {
  return {
    ...contactToContract(row, {
      suppressed: suppressionRows.some((suppression) => suppression.type === 'phone'),
    }),
    suppressions: suppressionRows.map(suppressionToContract),
  };
}

export function contactImportToSummary(
  row: ContactImportDbRow,
): ContactImportSummary {
  return {
    id: row.id,
    organizationId: row.organizationId,
    createdByUserId: row.createdByUserId,
    status: row.status as ContactImportStatus,
    filename: row.filename,
    fileSize: row.fileSize,
    contentType: row.contentType,
    source: row.source,
    phoneCountryCode: row.phoneCountryCode,
    totalRows: row.totalRows,
    processedRows: row.processedRows,
    createdCount: row.createdCount,
    updatedCount: row.updatedCount,
    skippedCount: row.skippedCount,
    invalidCount: row.invalidCount,
    duplicateCount: row.duplicateCount,
    suppressedCount: row.suppressedCount,
    errorSummary: Array.isArray(row.errorSummary)
      ? row.errorSummary.map(String)
      : [],
    completedAt: row.completedAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function contactImportToDetail(
  row: ContactImportDbRow,
): ContactImportDetail {
  return {
    ...contactImportToSummary(row),
    mapping: row.mapping as CsvMapping | null,
    preview: row.preview as ContactImportPreview | null,
  };
}

export function importRowToContract(row: ImportResultRow): ContactImportRow {
  return {
    id: row.id,
    organizationId: row.organizationId,
    contactImportId: row.contactImportId,
    rowNumber: row.rowNumber,
    status: row.status as ContactImportRowStatus,
    contactId: row.contactId,
    rawValues: isRecord(row.rawValues) ? stringifyRecord(row.rawValues) : {},
    normalizedValues: isRecord(row.normalizedValues)
      ? nullableStringRecord(row.normalizedValues)
      : {},
    errors: Array.isArray(row.errors) ? row.errors.map(String) : [],
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getOrganizationCountryCode(
  db: DbClient,
  organizationId: string,
) {
  assertOrganizationId(organizationId);

  const [profile] = await db
    .select({ countryCode: organizationProfiles.countryCode })
    .from(organizationProfiles)
    .where(eq(organizationProfiles.organizationId, organizationId))
    .limit(1);

  return profile?.countryCode ?? 'SE';
}

export async function createContactImport(
  db: DbClient,
  input: {
    organizationId: string;
    createdByUserId: string;
    fileKey: string;
    filename: string;
    fileSize: number;
    contentType: string;
    checksum?: string | null;
    source?: string | null;
    phoneCountryCode: string;
    preview: ContactImportPreview;
  },
) {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .insert(contactImports)
    .values({
      ...input,
      checksum: input.checksum ?? null,
      source: input.source ?? null,
    })
    .returning();

  return row ? contactImportToDetail(row) : null;
}

export async function getContactImportById(
  db: DbClient,
  input: { organizationId: string; contactImportId: string },
) {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .select()
    .from(contactImports)
    .where(
      and(
        eq(contactImports.organizationId, input.organizationId),
        eq(contactImports.id, input.contactImportId),
      ),
    )
    .limit(1);

  return row ? contactImportToDetail(row) : null;
}

export async function getContactImportForProcessing(
  db: DbClient,
  input: { organizationId: string; contactImportId: string },
): Promise<ContactImportProcessingRecord | null> {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .select({
      id: contactImports.id,
      organizationId: contactImports.organizationId,
      status: contactImports.status,
      fileKey: contactImports.fileKey,
      mapping: contactImports.mapping,
      phoneCountryCode: contactImports.phoneCountryCode,
    })
    .from(contactImports)
    .where(
      and(
        eq(contactImports.organizationId, input.organizationId),
        eq(contactImports.id, input.contactImportId),
      ),
    )
    .limit(1);

  return row
    ? {
        ...row,
        status: row.status as ContactImportStatus,
        mapping: row.mapping as CsvMapping | null,
      }
    : null;
}

export async function listContactImports(
  db: DbClient,
  input: { organizationId: string; query: ContactImportListQuery },
): Promise<ContactImportListResponse> {
  assertOrganizationId(input.organizationId);

  const where = [
    eq(contactImports.organizationId, input.organizationId),
    input.query.status ? eq(contactImports.status, input.query.status) : undefined,
  ].filter(Boolean);
  const offset = (input.query.page - 1) * input.query.pageSize;
  const rows = await db
    .select()
    .from(contactImports)
    .where(and(...where))
    .orderBy(desc(contactImports.createdAt))
    .limit(input.query.pageSize)
    .offset(offset);
  const [totalRow] = await db
    .select({ total: count() })
    .from(contactImports)
    .where(and(...where));

  return {
    imports: rows.map(contactImportToSummary),
    page: input.query.page,
    pageSize: input.query.pageSize,
    total: totalRow?.total ?? 0,
  };
}

export async function markContactImportProcessing(
  db: DbClient,
  input: {
    organizationId: string;
    contactImportId: string;
    mapping: CsvMapping;
    phoneCountryCode: string;
  },
): Promise<MarkContactImportProcessingResult> {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .update(contactImports)
    .set({
      mapping: input.mapping,
      phoneCountryCode: input.phoneCountryCode,
      status: 'processing',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contactImports.organizationId, input.organizationId),
        eq(contactImports.id, input.contactImportId),
        eq(contactImports.status, 'uploaded'),
      ),
    )
    .returning();

  if (row) {
    return { status: 'updated', import: contactImportToDetail(row) };
  }

  const existing = await getContactImportById(db, input);

  return existing
    ? { status: 'invalid_status', import: existing }
    : { status: 'not_found' };
}

export async function listContacts(
  db: DbClient,
  input: { organizationId: string; query: ContactListQuery },
): Promise<ContactListResponse> {
  assertOrganizationId(input.organizationId);

  const where = [
    eq(contacts.organizationId, input.organizationId),
    input.query.importedFrom
      ? eq(contacts.lastImportId, input.query.importedFrom)
      : undefined,
    input.query.search
      ? or(
          ilike(contacts.name, `%${input.query.search}%`),
          ilike(contacts.phone, `%${input.query.search}%`),
          ilike(contacts.email, `%${input.query.search}%`),
        )
      : undefined,
    contactStatusFilter(input.organizationId, input.query.status),
    contactIssueFilter(input.organizationId, input.query.issue),
  ].filter(Boolean);
  const offset = (input.query.page - 1) * input.query.pageSize;
  const rows = await db
    .select()
    .from(contacts)
    .where(and(...where))
    .orderBy(contactOrder(input.query.sort, input.query.direction))
    .limit(input.query.pageSize)
    .offset(offset);
  const suppressedPhoneHashes = rows
    .map((row) => row.phoneHash)
    .filter((hash): hash is string => Boolean(hash));
  const suppressionRows =
    suppressedPhoneHashes.length > 0
      ? await db
          .select({ valueHash: suppressions.valueHash })
          .from(suppressions)
          .where(
            and(
              eq(suppressions.organizationId, input.organizationId),
              eq(suppressions.type, 'phone'),
              inArray(suppressions.valueHash, suppressedPhoneHashes),
            ),
          )
      : [];
  const suppressed = new Set(suppressionRows.map((row) => row.valueHash));
  const [totalRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(and(...where));
  const mapped = rows.map((row) =>
    contactToContract(row, {
      suppressed: row.phoneHash ? suppressed.has(row.phoneHash) : false,
    }),
  );

  return {
    contacts: mapped,
    page: input.query.page,
    pageSize: input.query.pageSize,
    total: totalRow?.total ?? mapped.length,
  };
}

export async function getContactById(
  db: DbClient,
  input: { organizationId: string; contactId: string },
): Promise<ContactDetail | null> {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organizationId, input.organizationId),
        eq(contacts.id, input.contactId),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return contactDetailToContract(
    row,
    await listContactSuppressionsForRow(db, input.organizationId, row),
  );
}

export async function updateContact(
  db: DbClient,
  input: {
    organizationId: string;
    contactId: string;
    input: UpdateContactInput;
  },
): Promise<UpdateContactResult> {
  assertOrganizationId(input.organizationId);

  const [existing] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organizationId, input.organizationId),
        eq(contacts.id, input.contactId),
      ),
    )
    .limit(1);

  if (!existing) {
    return { status: 'not_found' };
  }

  const countryCode =
    input.input.phoneCountryCode ??
    (await getOrganizationCountryCode(db, input.organizationId));
  const phone =
    input.input.phone === undefined ? existing.phone : input.input.phone;
  const email =
    input.input.email === undefined ? existing.email : input.input.email;
  const normalizedPhone = phone
    ? normalizePhoneNumber(phone, countryCode)
    : null;
  const normalizedEmail = email ? normalizeEmail(email) : null;

  if (normalizedPhone && !normalizedPhone.ok) {
    return { status: 'invalid_phone' };
  }

  if (email && !normalizedEmail) {
    return { status: 'invalid_email' };
  }

  const normalizedPhoneValue =
    normalizedPhone && normalizedPhone.ok ? normalizedPhone.normalizedPhone : null;
  const phoneHash = normalizedPhoneValue
    ? await hashContactValue(normalizedPhoneValue)
    : null;
  const emailHash = normalizedEmail
    ? await hashContactValue(normalizedEmail)
    : null;

  if (
    await contactMethodBelongsToAnotherContact(db, {
      organizationId: input.organizationId,
      contactId: input.contactId,
      phoneHash,
      emailHash,
    })
  ) {
    return { status: 'duplicate' };
  }

  const [updated] = await db
    .update(contacts)
    .set({
      name: input.input.name === undefined ? existing.name : input.input.name,
      phone,
      email,
      normalizedPhone: normalizedPhoneValue,
      normalizedEmail,
      phoneHash,
      emailHash,
      lastBookingAt:
        input.input.lastBookingAt === undefined
          ? existing.lastBookingAt
          : input.input.lastBookingAt
            ? new Date(input.input.lastBookingAt)
            : null,
      lastService:
        input.input.lastService === undefined
          ? existing.lastService
          : input.input.lastService,
      source:
        input.input.source === undefined ? existing.source : input.input.source,
      consentStatus: input.input.consentStatus ?? existing.consentStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contacts.organizationId, input.organizationId),
        eq(contacts.id, input.contactId),
      ),
    )
    .returning();

  if (!updated) {
    return { status: 'not_found' };
  }

  return {
    status: 'updated',
    contact: contactDetailToContract(
      updated,
      await listContactSuppressionsForRow(db, input.organizationId, updated),
    ),
  };
}

export async function deleteContact(
  db: DbClient,
  input: { organizationId: string; contactId: string },
) {
  assertOrganizationId(input.organizationId);

  const [deleted] = await db
    .delete(contacts)
    .where(
      and(
        eq(contacts.organizationId, input.organizationId),
        eq(contacts.id, input.contactId),
      ),
    )
    .returning({ id: contacts.id });

  return Boolean(deleted);
}

export async function createContactSuppression(
  db: DbClient,
  input: {
    organizationId: string;
    contactId: string;
    type: SuppressionType;
  },
): Promise<CreateContactSuppressionResult> {
  assertOrganizationId(input.organizationId);

  const [contact] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organizationId, input.organizationId),
        eq(contacts.id, input.contactId),
      ),
    )
    .limit(1);

  if (!contact) {
    return { status: 'not_found' };
  }

  const method =
    input.type === 'phone'
      ? {
          hash: contact.phoneHash,
          normalizedValue: contact.normalizedPhone,
          value: contact.phone,
        }
      : {
          hash: contact.emailHash,
          normalizedValue: contact.normalizedEmail,
          value: contact.email,
        };

  if (!method.hash || !method.normalizedValue || !method.value) {
    return { status: 'missing_method' };
  }

  const existing = await findSuppressionByHash(db, {
    organizationId: input.organizationId,
    type: input.type,
    valueHash: method.hash,
  });

  if (existing) {
    return {
      status: 'existing',
      contact: contactDetailToContract(
        contact,
        await listContactSuppressionsForRow(db, input.organizationId, contact),
      ),
    };
  }

  const [created] = await db
    .insert(suppressions)
    .values({
      organizationId: input.organizationId,
      type: input.type,
      value: method.value,
      normalizedValue: method.normalizedValue,
      valueHash: method.hash,
      reason: 'manual_contact_suppression',
      source: 'app',
    })
    .onConflictDoNothing({
      target: [
        suppressions.organizationId,
        suppressions.type,
        suppressions.valueHash,
      ],
    })
    .returning({ id: suppressions.id });
  const updatedContact = created
    ? await touchContactUpdatedAt(db, {
        organizationId: input.organizationId,
        contactId: input.contactId,
      })
    : contact;

  return {
    status: 'created',
    contact: contactDetailToContract(
      updatedContact ?? contact,
      await listContactSuppressionsForRow(
        db,
        input.organizationId,
        updatedContact ?? contact,
      ),
    ),
  };
}

export async function deleteContactSuppression(
  db: DbClient,
  input: {
    organizationId: string;
    contactId: string;
    suppressionId: string;
  },
): Promise<DeleteContactSuppressionResult> {
  assertOrganizationId(input.organizationId);

  const [contact] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organizationId, input.organizationId),
        eq(contacts.id, input.contactId),
      ),
    )
    .limit(1);

  if (!contact) {
    return { status: 'not_found' };
  }

  const methodFilter = contactSuppressionMethodFilter(contact);

  if (!methodFilter) {
    return { status: 'not_found' };
  }

  const [suppression] = await db
    .select()
    .from(suppressions)
    .where(
      and(
        eq(suppressions.organizationId, input.organizationId),
        eq(suppressions.id, input.suppressionId),
        methodFilter,
      ),
    )
    .limit(1);

  if (!suppression) {
    return { status: 'not_found' };
  }

  const [deleted] = await db
    .delete(suppressions)
    .where(
      and(
        eq(suppressions.organizationId, input.organizationId),
        eq(suppressions.id, input.suppressionId),
      ),
    )
    .returning({ id: suppressions.id });

  if (!deleted) {
    return { status: 'not_found' };
  }

  const updatedContact = await touchContactUpdatedAt(db, {
    organizationId: input.organizationId,
    contactId: input.contactId,
  });

  return {
    status: 'deleted',
    contact: contactDetailToContract(
      updatedContact ?? contact,
      await listContactSuppressionsForRow(
        db,
        input.organizationId,
        updatedContact ?? contact,
      ),
    ),
  };
}

export function contactSuppressionMethodFilter(
  contact: Pick<ContactRow, 'phoneHash' | 'emailHash'>,
): SQL | undefined {
  const filters: SQL[] = [];

  if (contact.phoneHash) {
    const phoneFilter = and(
      eq(suppressions.type, 'phone'),
      eq(suppressions.valueHash, contact.phoneHash),
    );

    if (phoneFilter) {
      filters.push(phoneFilter);
    }
  }

  if (contact.emailHash) {
    const emailFilter = and(
      eq(suppressions.type, 'email'),
      eq(suppressions.valueHash, contact.emailHash),
    );

    if (emailFilter) {
      filters.push(emailFilter);
    }
  }

  return or(...filters);
}

async function touchContactUpdatedAt(
  db: DbClient,
  input: { organizationId: string; contactId: string },
) {
  const [row] = await db
    .update(contacts)
    .set({ updatedAt: new Date() })
    .where(
      and(
        eq(contacts.organizationId, input.organizationId),
        eq(contacts.id, input.contactId),
      ),
    )
    .returning();

  return row ?? null;
}

async function listContactSuppressionsForRow(
  db: DbClient,
  organizationId: string,
  row: ContactRow,
) {
  const filters = [
    row.phoneHash
      ? and(eq(suppressions.type, 'phone'), eq(suppressions.valueHash, row.phoneHash))
      : undefined,
    row.emailHash
      ? and(eq(suppressions.type, 'email'), eq(suppressions.valueHash, row.emailHash))
      : undefined,
  ].filter(Boolean);

  if (filters.length === 0) {
    return [];
  }

  return db
    .select()
    .from(suppressions)
    .where(and(eq(suppressions.organizationId, organizationId), or(...filters)));
}

async function contactMethodBelongsToAnotherContact(
  db: DbClient,
  input: {
    organizationId: string;
    contactId: string;
    phoneHash: string | null;
    emailHash: string | null;
  },
) {
  const filters = [
    input.phoneHash ? eq(contacts.phoneHash, input.phoneHash) : undefined,
    input.emailHash ? eq(contacts.emailHash, input.emailHash) : undefined,
  ].filter(Boolean);

  if (filters.length === 0) {
    return false;
  }

  const [match] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        eq(contacts.organizationId, input.organizationId),
        ne(contacts.id, input.contactId),
        or(...filters),
      ),
    )
    .limit(1);

  return Boolean(match);
}

export async function listContactImportRows(
  db: DbClient,
  input: {
    organizationId: string;
    contactImportId: string;
    query: ContactImportRowsQuery;
  },
): Promise<ContactImportRowsResponse> {
  assertOrganizationId(input.organizationId);

  const where = [
    eq(contactImportRows.organizationId, input.organizationId),
    eq(contactImportRows.contactImportId, input.contactImportId),
    input.query.status
      ? eq(contactImportRows.status, input.query.status)
      : undefined,
  ].filter(Boolean);
  const offset = (input.query.page - 1) * input.query.pageSize;
  const rows = await db
    .select()
    .from(contactImportRows)
    .where(and(...where))
    .orderBy(contactImportRows.rowNumber)
    .limit(input.query.pageSize)
    .offset(offset);
  const [totalRow] = await db
    .select({ total: count() })
    .from(contactImportRows)
    .where(and(...where));

  return {
    rows: rows.map(importRowToContract),
    page: input.query.page,
    pageSize: input.query.pageSize,
    total: totalRow?.total ?? 0,
  };
}

export async function findSuppressionByHash(
  db: DbClient,
  input: { organizationId: string; type: 'phone' | 'email'; valueHash: string },
) {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .select()
    .from(suppressions)
    .where(
      and(
        eq(suppressions.organizationId, input.organizationId),
        eq(suppressions.type, input.type),
        eq(suppressions.valueHash, input.valueHash),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function upsertImportedContact(
  db: DbClient,
  input: {
    organizationId: string;
    contactImportId: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    normalizedPhone: string | null;
    normalizedEmail: string | null;
    phoneHash: string | null;
    emailHash: string | null;
    lastBookingAt: Date | null;
    lastService: string | null;
    consentStatus: ContactConsentStatus;
    source: string | null;
  },
) {
  assertOrganizationId(input.organizationId);

  const [phoneMatch] = input.phoneHash
    ? await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, input.organizationId),
            eq(contacts.phoneHash, input.phoneHash),
          ),
        )
        .limit(1)
    : [];
  const [emailMatch] = input.emailHash
    ? await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, input.organizationId),
            eq(contacts.emailHash, input.emailHash),
          ),
        )
        .limit(1)
    : [];
  const match = resolveImportedContactMatch({
    phoneMatch: phoneMatch ?? null,
    emailMatch: emailMatch ?? null,
  });

  if (match.action === 'conflict') {
    return { contact: null, action: 'conflict' as const };
  }

  const existing = match.contact;

  if (existing) {
    const [updated] = await db
      .update(contacts)
      .set({
        name: input.name ?? existing.name,
        phone: input.phone ?? existing.phone,
        email: input.email ?? existing.email,
        normalizedPhone: input.normalizedPhone ?? existing.normalizedPhone,
        normalizedEmail: input.normalizedEmail ?? existing.normalizedEmail,
        phoneHash: input.phoneHash ?? existing.phoneHash,
        emailHash: input.emailHash ?? existing.emailHash,
        lastBookingAt: input.lastBookingAt ?? existing.lastBookingAt,
        lastService: input.lastService ?? existing.lastService,
        consentStatus: input.consentStatus,
        source: input.source ?? existing.source,
        lastImportId: input.contactImportId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contacts.organizationId, input.organizationId),
          eq(contacts.id, existing.id),
        ),
      )
      .returning();

    return { contact: updated ? contactToContract(updated, { suppressed: false }) : null, action: 'updated' as const };
  }

  const [created] = await db
    .insert(contacts)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      normalizedPhone: input.normalizedPhone,
      normalizedEmail: input.normalizedEmail,
      phoneHash: input.phoneHash,
      emailHash: input.emailHash,
      lastBookingAt: input.lastBookingAt,
      lastService: input.lastService,
      consentStatus: input.consentStatus,
      source: input.source,
      createdFromImportId: input.contactImportId,
      lastImportId: input.contactImportId,
    })
    .returning();

  return { contact: created ? contactToContract(created, { suppressed: false }) : null, action: 'created' as const };
}

export function resolveImportedContactMatch<TContact extends { id: string }>(
  input: { phoneMatch: TContact | null; emailMatch: TContact | null },
):
  | { action: 'matched'; contact: TContact | null }
  | { action: 'conflict' } {
  if (
    input.phoneMatch &&
    input.emailMatch &&
    input.phoneMatch.id !== input.emailMatch.id
  ) {
    return { action: 'conflict' };
  }

  return {
    action: 'matched',
    contact: input.phoneMatch ?? input.emailMatch,
  };
}

export async function upsertContactImportRow(
  db: DbClient,
  input: {
    organizationId: string;
    contactImportId: string;
    rowNumber: number;
    status: ContactImportRowStatus;
    contactId: string | null;
    rawValues: Record<string, string>;
    normalizedValues: Record<string, string | null>;
    errors: string[];
  },
) {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .insert(contactImportRows)
    .values(input)
    .onConflictDoUpdate({
      target: [
        contactImportRows.organizationId,
        contactImportRows.contactImportId,
        contactImportRows.rowNumber,
      ],
      set: {
        status: input.status,
        contactId: input.contactId,
        rawValues: input.rawValues,
        normalizedValues: input.normalizedValues,
        errors: input.errors,
      },
    })
    .returning();

  return row ? importRowToContract(row) : null;
}

export async function completeContactImportFromRows(
  db: DbClient,
  input: {
    organizationId: string;
    contactImportId: string;
  },
) {
  assertOrganizationId(input.organizationId);
  const rows = await db
    .select({
      status: contactImportRows.status,
      errors: contactImportRows.errors,
    })
    .from(contactImportRows)
    .where(
      and(
        eq(contactImportRows.organizationId, input.organizationId),
        eq(contactImportRows.contactImportId, input.contactImportId),
      ),
    );
  const counts = rows.reduce(
    (accumulator, row) => {
      accumulator.totalRows += 1;
      accumulator.processedRows += 1;

      if (row.status === 'created') accumulator.createdCount += 1;
      if (row.status === 'updated') accumulator.updatedCount += 1;
      if (row.status === 'skipped') accumulator.skippedCount += 1;
      if (row.status === 'invalid') accumulator.invalidCount += 1;
      if (row.status === 'duplicate') accumulator.duplicateCount += 1;
      if (row.status === 'suppressed') accumulator.suppressedCount += 1;

      if (Array.isArray(row.errors)) {
        row.errors.forEach((error) => accumulator.errorSummary.add(String(error)));
      }

      return accumulator;
    },
    {
      totalRows: 0,
      processedRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      suppressedCount: 0,
      errorSummary: new Set<string>(),
    },
  );

  const [row] = await db
    .update(contactImports)
    .set({
      totalRows: counts.totalRows,
      processedRows: counts.processedRows,
      createdCount: counts.createdCount,
      updatedCount: counts.updatedCount,
      skippedCount: counts.skippedCount,
      invalidCount: counts.invalidCount,
      duplicateCount: counts.duplicateCount,
      suppressedCount: counts.suppressedCount,
      errorSummary: Array.from(counts.errorSummary),
      status: 'completed',
      completedAt: new Date(),
      failedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contactImports.organizationId, input.organizationId),
        eq(contactImports.id, input.contactImportId),
      ),
    )
    .returning();

  return row ? contactImportToDetail(row) : null;
}

export async function failContactImport(
  db: DbClient,
  input: { organizationId: string; contactImportId: string; error: string },
) {
  assertOrganizationId(input.organizationId);

  const [row] = await db
    .update(contactImports)
    .set({
      status: 'failed',
      errorSummary: [input.error],
      failedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contactImports.organizationId, input.organizationId),
        eq(contactImports.id, input.contactImportId),
      ),
    )
    .returning();

  return row ? contactImportToDetail(row) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringifyRecord(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry ?? '')]),
  );
}

function nullableStringRecord(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      entry === null ? null : String(entry),
    ]),
  );
}

export function contactStatusFilter(
  organizationId: string,
  status: ContactListQuery['status'],
) {
  if (!status) {
    return undefined;
  }

  const phoneSuppressionExists = phoneSuppressionExistsFilter(organizationId);

  if (status === 'incomplete') {
    return isNull(contacts.normalizedPhone);
  }

  if (status === 'blocked') {
    return and(
      isNotNull(contacts.normalizedPhone),
      or(ne(contacts.consentStatus, 'granted'), phoneSuppressionExists),
    );
  }

  return and(
    isNotNull(contacts.normalizedPhone),
    eq(contacts.consentStatus, 'granted'),
    not(phoneSuppressionExists),
  );
}

export function contactIssueFilter(
  organizationId: string,
  issue: ContactListQuery['issue'],
) {
  if (!issue) {
    return undefined;
  }

  const phoneSuppressionExists = phoneSuppressionExistsFilter(organizationId);

  if (issue === 'missing_phone' || issue === 'invalid_phone') {
    return isNull(contacts.normalizedPhone);
  }

  if (issue === 'suppressed_phone') {
    return phoneSuppressionExists;
  }

  return ne(contacts.consentStatus, 'granted');
}

function phoneSuppressionExistsFilter(organizationId: string) {
  return sql`exists (
    select 1 from ${suppressions}
    where ${suppressions.organizationId} = ${organizationId}
      and ${suppressions.type} = ${'phone'}
      and ${suppressions.valueHash} = ${contacts.phoneHash}
  )`;
}

function contactOrder(
  sort: ContactListQuery['sort'],
  direction: ContactListQuery['direction'],
) {
  const column = {
    createdAt: contacts.createdAt,
    lastBookingAt: contacts.lastBookingAt,
    lastContactedAt: contacts.lastContactedAt,
    name: contacts.name,
  }[sort];

  return direction === 'asc' ? asc(column) : desc(column);
}
