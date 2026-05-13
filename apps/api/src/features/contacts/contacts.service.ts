import {
  completeContactImportFromRows,
  failContactImport,
  findSuppressionByHash,
  getContactImportForProcessing,
  upsertContactImportRow,
  upsertImportedContact,
  type DbClient,
} from '@retaino/db';
import {
  contactImportMappedHeaders,
  contactImportRowForHeaders,
  contactMethodDedupeKeys,
  prepareContactMethods,
  type ContactImportRowStatus,
  type CsvMapping,
} from '@retaino/shared/contracts';
import { parse } from 'csv-parse/sync';

type ProcessContactImportInput = {
  db: DbClient;
  bucket: R2Bucket;
  organizationId: string;
  contactImportId: string;
};

type PreparedRow = {
  rowNumber: number;
  rawValues: Record<string, string>;
  name: string | null;
  phone: string | null;
  email: string | null;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
  phoneHash: string | null;
  emailHash: string | null;
  lastBookingAt: Date | null;
  lastService: string | null;
  source: string | null;
  persistedRawValues: Record<string, string>;
  errors: string[];
};

export async function processContactImport(input: ProcessContactImportInput) {
  try {
    const importRecord = await getContactImportForProcessing(input.db, {
      organizationId: input.organizationId,
      contactImportId: input.contactImportId,
    });

    if (!importRecord) {
      throw new Error('Contact import was not found.');
    }

    if (importRecord.status !== 'processing') {
      throw new Error('Contact import is not ready for processing.');
    }

    if (!importRecord.mapping) {
      throw new Error('Contact import mapping is missing.');
    }

    const object = await input.bucket.get(importRecord.fileKey);

    if (!object) {
      throw new Error('Contact import file was not found.');
    }

    const csvText = new TextDecoder().decode(await object.arrayBuffer());
    const rows = parse(csvText, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
    const seenContactMethods = new Set<string>();
    for (const [index, rawValues] of rows.entries()) {
      const prepared = await prepareRow({
        rowNumber: index + 2,
        rawValues,
        mapping: importRecord.mapping,
        phoneCountryCode: importRecord.phoneCountryCode,
      });

      if (prepared.errors.length > 0) {
        await writeRowResult(input, prepared, 'invalid', prepared.errors);
        continue;
      }

      const dedupeKeys = contactMethodDedupeKeys(prepared);
      const duplicate = dedupeKeys.some((key) => seenContactMethods.has(key));

      if (duplicate) {
        await writeRowResult(input, prepared, 'duplicate', [
          'duplicate_contact_method',
        ]);
        continue;
      }

      dedupeKeys.forEach((key) => seenContactMethods.add(key));

      if (await isSuppressed(input.db, input.organizationId, prepared)) {
        await writeRowResult(input, prepared, 'suppressed', [
          'suppressed_contact_method',
        ]);
        continue;
      }

      const result = await upsertImportedContact(input.db, {
        organizationId: input.organizationId,
        contactImportId: input.contactImportId,
        name: prepared.name,
        phone: prepared.phone,
        email: prepared.email,
        normalizedPhone: prepared.normalizedPhone,
        normalizedEmail: prepared.normalizedEmail,
        phoneHash: prepared.phoneHash,
        emailHash: prepared.emailHash,
        lastBookingAt: prepared.lastBookingAt,
        lastService: prepared.lastService,
        consentStatus: 'granted',
        source: prepared.source,
      });

      if (result.action === 'conflict') {
        await writeRowResult(input, prepared, 'skipped', [
          'conflicting_contact_methods',
        ]);
      } else if (result.action === 'created') {
        await writeRowResult(
          input,
          prepared,
          'created',
          [],
          result.contact?.id ?? null,
          false,
        );
      } else {
        await writeRowResult(
          input,
          prepared,
          'updated',
          [],
          result.contact?.id ?? null,
          false,
        );
      }
    }

    await completeContactImportFromRows(input.db, {
      organizationId: input.organizationId,
      contactImportId: input.contactImportId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Contact import failed.';

    await failContactImport(input.db, {
      organizationId: input.organizationId,
      contactImportId: input.contactImportId,
      error: message,
    });

    throw error;
  }
}

async function prepareRow(input: {
  rowNumber: number;
  rawValues: Record<string, string>;
  mapping: CsvMapping;
  phoneCountryCode: string;
}): Promise<PreparedRow> {
  const phone = mappedValue(input.rawValues, input.mapping.phone);
  const email = mappedValue(input.rawValues, input.mapping.email);
  const methods = await prepareContactMethods({
    phone,
    email,
    phoneCountryCode: input.phoneCountryCode,
    requireContactMethod: true,
  });
  const errors: string[] = [...methods.errors];

  const parsedBookingDate = parseOptionalDate(
    mappedValue(input.rawValues, input.mapping.lastBookingAt),
  );

  if (parsedBookingDate.error) {
    errors.push(parsedBookingDate.error);
  }

  return {
    rowNumber: input.rowNumber,
    rawValues: input.rawValues,
    name: mappedValue(input.rawValues, input.mapping.name),
    phone: methods.phone,
    email: methods.email,
    normalizedPhone: methods.normalizedPhone,
    normalizedEmail: methods.normalizedEmail,
    phoneHash: methods.phoneHash,
    emailHash: methods.emailHash,
    lastBookingAt: parsedBookingDate.value,
    lastService: mappedValue(input.rawValues, input.mapping.lastService),
    source: mappedValue(input.rawValues, input.mapping.source),
    persistedRawValues: contactImportRowForHeaders(
      input.rawValues,
      contactImportMappedHeaders(input.mapping),
    ),
    errors,
  };
}

async function writeRowResult(
  input: ProcessContactImportInput,
  row: PreparedRow,
  status: ContactImportRowStatus,
  errors: string[],
  contactId: string | null = null,
  includeRawValues = true,
) {
  await upsertContactImportRow(input.db, {
    organizationId: input.organizationId,
    contactImportId: input.contactImportId,
    rowNumber: row.rowNumber,
    status,
    contactId,
    rawValues: includeRawValues ? row.persistedRawValues : {},
    normalizedValues: {
      phone: row.normalizedPhone,
      email: row.normalizedEmail,
    },
    errors,
  });
}

async function isSuppressed(
  db: DbClient,
  organizationId: string,
  row: PreparedRow,
) {
  if (row.phoneHash) {
    const suppression = await findSuppressionByHash(db, {
      organizationId,
      type: 'phone',
      valueHash: row.phoneHash,
    });

    if (suppression) {
      return true;
    }
  }

  if (row.emailHash) {
    const suppression = await findSuppressionByHash(db, {
      organizationId,
      type: 'email',
      valueHash: row.emailHash,
    });

    if (suppression) {
      return true;
    }
  }

  return false;
}

function mappedValue(row: Record<string, string>, header: string | undefined) {
  if (!header) {
    return null;
  }

  const value = row[header]?.trim();
  return value ? value : null;
}

function parseOptionalDate(value: string | null):
  | { value: Date | null; error: null }
  | { value: null; error: 'invalid_last_booking_at' } {
  if (!value) {
    return { value: null, error: null };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return { value: null, error: 'invalid_last_booking_at' };
  }

  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return { value: null, error: 'invalid_last_booking_at' };
  }

  return { value: date, error: null };
}
