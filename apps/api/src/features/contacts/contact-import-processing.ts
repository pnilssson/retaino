import {
  findSuppressionByHash,
  type ContactImportCounts,
  type DbClient,
} from '@retaino/db';
import {
  prepareContactMethodIdentity,
  type CsvMapping,
} from '@retaino/shared/contracts';

export type PreparedContactImportRow = {
  rowNumber: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
  phoneHash: string | null;
  emailHash: string | null;
  lastBookingAt: Date | null;
};

export type ContactImportRowOutcome =
  | { action: 'ready'; row: PreparedContactImportRow }
  | { action: 'invalid' | 'duplicate' | 'suppressed'; errors: string[] };

export type ContactImportAccumulator = {
  counts: ContactImportCounts;
  seenContactMethods: Set<string>;
};

type CountedImportOutcome =
  | 'created'
  | 'updated'
  | 'duplicate'
  | 'invalid'
  | 'suppressed'
  | 'skipped';

export function createContactImportAccumulator(): ContactImportAccumulator {
  return {
    counts: {
      totalRows: 0,
      processedRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      suppressedCount: 0,
      errorSummary: [],
    },
    seenContactMethods: new Set<string>(),
  };
}

export async function classifyContactImportRow(input: {
  db: DbClient;
  organizationId: string;
  rowNumber: number;
  rawValues: Record<string, string>;
  mapping: CsvMapping;
  phoneCountryCode: string;
  accumulator: ContactImportAccumulator;
}): Promise<ContactImportRowOutcome> {
  const prepared = await prepareContactImportRow(input);

  if (prepared.errors.length > 0) {
    recordContactImportOutcome(input.accumulator, 'invalid', prepared.errors);
    return { action: 'invalid', errors: prepared.errors };
  }

  const duplicate = prepared.dedupeKeys.some((key) =>
    input.accumulator.seenContactMethods.has(key),
  );

  if (duplicate) {
    const errors = ['duplicate_contact_method'];
    recordContactImportOutcome(input.accumulator, 'duplicate', errors);
    return { action: 'duplicate', errors };
  }

  prepared.dedupeKeys.forEach((key) =>
    input.accumulator.seenContactMethods.add(key),
  );

  if (await isSuppressed(input.db, input.organizationId, prepared)) {
    const errors = ['suppressed_contact_method'];
    recordContactImportOutcome(input.accumulator, 'suppressed', errors);
    return { action: 'suppressed', errors };
  }

  return {
    action: 'ready',
    row: {
      rowNumber: prepared.rowNumber,
      name: prepared.name,
      phone: prepared.phone,
      email: prepared.email,
      normalizedPhone: prepared.normalizedPhone,
      normalizedEmail: prepared.normalizedEmail,
      phoneHash: prepared.phoneHash,
      emailHash: prepared.emailHash,
      lastBookingAt: prepared.lastBookingAt,
    },
  };
}

export function recordContactImportOutcome(
  accumulator: ContactImportAccumulator,
  outcome: CountedImportOutcome,
  errors: string[] = [],
) {
  accumulator.counts.totalRows += 1;
  accumulator.counts.processedRows += 1;

  if (outcome === 'created') accumulator.counts.createdCount += 1;
  if (outcome === 'updated') accumulator.counts.updatedCount += 1;
  if (outcome === 'skipped') accumulator.counts.skippedCount += 1;
  if (outcome === 'invalid') accumulator.counts.invalidCount += 1;
  if (outcome === 'duplicate') accumulator.counts.duplicateCount += 1;
  if (outcome === 'suppressed') accumulator.counts.suppressedCount += 1;

  for (const error of errors) {
    if (!accumulator.counts.errorSummary.includes(error)) {
      accumulator.counts.errorSummary.push(error);
    }
  }
}

async function prepareContactImportRow(input: {
  rowNumber: number;
  rawValues: Record<string, string>;
  mapping: CsvMapping;
  phoneCountryCode: string;
}) {
  const phone = mappedValue(input.rawValues, input.mapping.phone);
  const email = mappedValue(input.rawValues, input.mapping.email);
  const identity = await prepareContactMethodIdentity({
    phone,
    email,
    phoneCountryCode: input.phoneCountryCode,
    requireContactMethod: true,
  });
  const errors: string[] = [...identity.errors];
  const parsedBookingDate = parseOptionalDate(
    mappedValue(input.rawValues, input.mapping.lastBookingAt),
  );

  if (parsedBookingDate.error) {
    errors.push(parsedBookingDate.error);
  }

  return {
    rowNumber: input.rowNumber,
    name: mappedValue(input.rawValues, input.mapping.name),
    phone: identity.phone,
    email: identity.email,
    normalizedPhone: identity.normalizedPhone,
    normalizedEmail: identity.normalizedEmail,
    phoneHash: identity.phoneHash,
    emailHash: identity.emailHash,
    lastBookingAt: parsedBookingDate.value,
    dedupeKeys: identity.dedupeKeys,
    errors,
  };
}

async function isSuppressed(
  db: DbClient,
  organizationId: string,
  row: Pick<PreparedContactImportRow, 'phoneHash' | 'emailHash'>,
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
