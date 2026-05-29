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
  type ContactImportStatus,
  type ContactListQuery,
  type ContactListResponse,
  type ContactSuppression,
  type CsvMapping,
  type SuppressionType,
  type UpdateContactInput,
  prepareContactMethodIdentity,
} from '@retaino/shared/contracts';
import { auditEvents } from '../audit-events';
import type { DbClient } from '../client';
import {
  contactImports,
  contacts,
  organizationProfiles,
  suppressions,
} from '../schema';
import { recordAuditLog, type AuditLogDb } from './audit-logs';

type ContactRow = typeof contacts.$inferSelect;
type ContactImportDbRow = typeof contactImports.$inferSelect;
type SuppressionRow = typeof suppressions.$inferSelect;

export type ContactImportProcessingRecord = {
  id: string;
  organizationId: string;
  status: ContactImportStatus;
  fileKey: string | null;
  mapping: CsvMapping | null;
  phoneCountryCode: string;
};

export type ContactImportCounts = {
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  invalidCount: number;
  duplicateCount: number;
  suppressedCount: number;
  errorSummary: string[];
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
    consentStatus: row.consentStatus as ContactConsentStatus,
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

export function contactImportToDetail(row: ContactImportDbRow): ContactImportDetail {
  return {
    id: row.id,
    organizationId: row.organizationId,
    createdByUserId: row.createdByUserId,
    status: row.status as ContactImportStatus,
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
    permissionAttestedAt: row.permissionAttestedAt?.toISOString() ?? null,
    permissionAttestedByUserId: row.permissionAttestedByUserId,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
    fileName: string;
    fileSize: number;
    mapping: CsvMapping;
    phoneCountryCode: string;
    permissionAttestedByUserId: string;
    userAgent?: string | null;
  },
) {
  assertOrganizationId(input.organizationId);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(contactImports)
      .values({
        organizationId: input.organizationId,
        createdByUserId: input.createdByUserId,
        status: 'processing',
        fileKey: input.fileKey,
        mapping: input.mapping,
        phoneCountryCode: input.phoneCountryCode,
        permissionAttestedAt: now,
        permissionAttestedByUserId: input.permissionAttestedByUserId,
        startedAt: now,
      })
      .returning();

    if (!row) {
      return null;
    }

    await recordAuditLog(
      tx,
      auditEvents.contactImportStarted({
        organizationId: input.organizationId,
        actorUserId: input.createdByUserId,
        contactImportId: row.id,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mapping: input.mapping,
        phoneCountryCode: input.phoneCountryCode,
        permissionAttestedAt: now,
        userAgent: input.userAgent ?? null,
      }),
    );

    return contactImportToDetail(row);
  });
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

export async function listContacts(
  db: DbClient,
  input: { organizationId: string; query: ContactListQuery },
): Promise<ContactListResponse> {
  assertOrganizationId(input.organizationId);

  const where = [
    eq(contacts.organizationId, input.organizationId),
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
  const methods = await prepareContactMethodIdentity({
    phone,
    email,
    phoneCountryCode: countryCode,
  });

  if (methods.errors.includes('invalid_phone')) {
    return { status: 'invalid_phone' };
  }

  if (methods.errors.includes('invalid_email')) {
    return { status: 'invalid_email' };
  }

  if (
    await contactMethodBelongsToAnotherContact(db, {
      organizationId: input.organizationId,
      contactId: input.contactId,
      phoneHash: methods.phoneHash,
      emailHash: methods.emailHash,
    })
  ) {
    return { status: 'duplicate' };
  }

  const [updated] = await db
    .update(contacts)
    .set({
      name: input.input.name === undefined ? existing.name : input.input.name,
      phone: methods.phone,
      email: methods.email,
      normalizedPhone: methods.normalizedPhone,
      normalizedEmail: methods.normalizedEmail,
      phoneHash: methods.phoneHash,
      emailHash: methods.emailHash,
      lastBookingAt:
        input.input.lastBookingAt === undefined
          ? existing.lastBookingAt
          : input.input.lastBookingAt
            ? new Date(input.input.lastBookingAt)
            : null,
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
  input: {
    organizationId: string;
    contactId: string;
    actorUserId: string;
    userAgent?: string | null;
  },
) {
  assertOrganizationId(input.organizationId);

  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(contacts)
      .where(
        and(
          eq(contacts.organizationId, input.organizationId),
          eq(contacts.id, input.contactId),
        ),
      )
      .returning({ id: contacts.id });

    if (!deleted) {
      return false;
    }

    await recordAuditLog(
      tx,
      auditEvents.contactsDeleted({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        mode: 'single',
        requestedContactIds: [input.contactId],
        deletedContactIds: [deleted.id],
        userAgent: input.userAgent ?? null,
      }),
    );

    return true;
  });
}

export async function deleteContacts(
  db: DbClient,
  input: {
    organizationId: string;
    contactIds: string[];
    actorUserId: string;
    userAgent?: string | null;
  },
) {
  assertOrganizationId(input.organizationId);

  if (input.contactIds.length === 0) {
    return 0;
  }

  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(contacts)
      .where(
        and(
          eq(contacts.organizationId, input.organizationId),
          inArray(contacts.id, input.contactIds),
        ),
      )
      .returning({ id: contacts.id });

    if (deleted.length === 0) {
      return 0;
    }

    await recordAuditLog(
      tx,
      auditEvents.contactsDeleted({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        mode: 'bulk',
        requestedContactIds: input.contactIds,
        deletedContactIds: deleted.map((contact) => contact.id),
        userAgent: input.userAgent ?? null,
      }),
    );

    return deleted.length;
  });
}

export async function suppressContacts(
  db: DbClient,
  input: {
    organizationId: string;
    contactIds: string[];
    type: Extract<SuppressionType, 'phone'>;
  },
) {
  assertOrganizationId(input.organizationId);

  if (input.contactIds.length === 0) {
    return { affectedCount: 0, skippedCount: 0 };
  }

  const contactRows = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organizationId, input.organizationId),
        inArray(contacts.id, input.contactIds),
      ),
    );
  const suppressionValues = contactRows.flatMap((contact) => {
    if (!contact.phoneHash || !contact.normalizedPhone || !contact.phone) {
      return [];
    }

    return [
      {
        organizationId: input.organizationId,
        type: input.type,
        value: contact.phone,
        normalizedValue: contact.normalizedPhone,
        valueHash: contact.phoneHash,
        reason: 'manual_contact_suppression',
        source: 'app',
      },
    ];
  });

  if (suppressionValues.length === 0) {
    return { affectedCount: 0, skippedCount: input.contactIds.length };
  }

  const inserted = await db
    .insert(suppressions)
    .values(suppressionValues)
    .onConflictDoNothing({
      target: [
        suppressions.organizationId,
        suppressions.type,
        suppressions.valueHash,
      ],
    })
    .returning({ valueHash: suppressions.valueHash });
  const insertedHashes = Array.from(
    new Set(inserted.map((suppression) => suppression.valueHash)),
  );

  if (insertedHashes.length > 0) {
    await db
      .update(contacts)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(contacts.organizationId, input.organizationId),
          inArray(contacts.phoneHash, insertedHashes),
        ),
      );
  }

  return {
    affectedCount: inserted.length,
    skippedCount: input.contactIds.length - inserted.length,
  };
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
    actorUserId: string;
    userAgent?: string | null;
  },
): Promise<DeleteContactSuppressionResult> {
  assertOrganizationId(input.organizationId);

  return db.transaction(async (tx) => {
    const [contact] = await tx
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

    const [suppression] = await tx
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

    const [deleted] = await tx
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

    await recordAuditLog(
      tx,
      auditEvents.contactSuppressionDeleted({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        contactId: input.contactId,
        suppressionId: suppression.id,
        type: suppression.type as SuppressionType,
        valueHash: suppression.valueHash,
        reason: suppression.reason,
        source: suppression.source,
        createdAt: suppression.createdAt,
        userAgent: input.userAgent ?? null,
      }),
    );

    const updatedContact = await touchContactUpdatedAt(tx, {
      organizationId: input.organizationId,
      contactId: input.contactId,
    });

    return {
      status: 'deleted',
      contact: contactDetailToContract(
        updatedContact ?? contact,
        await listContactSuppressionsForRow(
          tx,
          input.organizationId,
          updatedContact ?? contact,
        ),
      ),
    };
  });
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
  db: Pick<AuditLogDb, 'update'>,
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
  db: Pick<AuditLogDb, 'select'>,
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

export async function upsertSuppressionByHash(
  db: DbClient,
  input: {
    organizationId: string;
    type: SuppressionType;
    value: string;
    normalizedValue: string;
    valueHash: string;
    reason: string;
    source: string | null;
  },
) {
  assertOrganizationId(input.organizationId);

  const [created] = await db
    .insert(suppressions)
    .values(input)
    .onConflictDoNothing({
      target: [
        suppressions.organizationId,
        suppressions.type,
        suppressions.valueHash,
      ],
    })
    .returning();

  if (created) {
    return suppressionToContract(created);
  }

  const existing = await findSuppressionByHash(db, {
    organizationId: input.organizationId,
    type: input.type,
    valueHash: input.valueHash,
  });

  return existing ? suppressionToContract(existing) : null;
}

export async function upsertImportedContact(
  db: DbClient,
  input: {
    organizationId: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    normalizedPhone: string | null;
    normalizedEmail: string | null;
    phoneHash: string | null;
    emailHash: string | null;
    lastBookingAt: Date | null;
    consentStatus: ContactConsentStatus;
    suppressed: boolean;
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
        consentStatus: input.consentStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contacts.organizationId, input.organizationId),
          eq(contacts.id, existing.id),
        ),
      )
      .returning();

    return {
      contact: updated
        ? contactToContract(updated, { suppressed: input.suppressed })
        : null,
      action: 'updated' as const,
    };
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
      consentStatus: input.consentStatus,
    })
    .returning();

  return {
    contact: created
      ? contactToContract(created, { suppressed: input.suppressed })
      : null,
    action: 'created' as const,
  };
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

export async function completeContactImport(
  db: DbClient,
  input: {
    organizationId: string;
    contactImportId: string;
    counts: ContactImportCounts;
  },
) {
  assertOrganizationId(input.organizationId);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(contactImports)
      .set({
        totalRows: input.counts.totalRows,
        processedRows: input.counts.processedRows,
        createdCount: input.counts.createdCount,
        updatedCount: input.counts.updatedCount,
        skippedCount: input.counts.skippedCount,
        invalidCount: input.counts.invalidCount,
        duplicateCount: input.counts.duplicateCount,
        suppressedCount: input.counts.suppressedCount,
        errorSummary: input.counts.errorSummary,
        status: 'completed',
        fileKey: null,
        mapping: null,
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

    if (!row) {
      return null;
    }

    await recordAuditLog(
      tx,
      auditEvents.contactImportCompleted({
        organizationId: input.organizationId,
        actorUserId: row.createdByUserId,
        contactImportId: input.contactImportId,
        counts: input.counts,
      }),
    );

    return contactImportToDetail(row);
  });
}

export async function failContactImport(
  db: DbClient,
  input: { organizationId: string; contactImportId: string; error: string },
) {
  assertOrganizationId(input.organizationId);

  return db.transaction(async (tx) => {
    const errorSummary = [input.error];
    const [row] = await tx
      .update(contactImports)
      .set({
        status: 'failed',
        fileKey: null,
        mapping: null,
        errorSummary,
        failedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contactImports.organizationId, input.organizationId),
          eq(contactImports.id, input.contactImportId),
          eq(contactImports.status, 'processing'),
        ),
      )
      .returning();

    if (!row) {
      return null;
    }

    await recordAuditLog(
      tx,
      auditEvents.contactImportFailed({
        organizationId: input.organizationId,
        actorUserId: row.createdByUserId,
        contactImportId: input.contactImportId,
        errorSummary,
      }),
    );

    return contactImportToDetail(row);
  });
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

export function phoneSuppressionExistsFilter(organizationId: string) {
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
