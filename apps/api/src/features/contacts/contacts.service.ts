import {
  completeContactImport,
  failContactImport,
  getContactImportForProcessing,
  upsertImportedContact,
  type DbClient,
} from '@retaino/db';
import { parse } from 'csv-parse/sync';
import {
  classifyContactImportRow,
  createContactImportAccumulator,
  recordContactImportOutcome,
} from './contact-import-processing';
import { deleteTemporaryImportFile } from './contact-import-storage';
import { captureBackgroundError } from '../../lib/sentry';

type ProcessContactImportInput = {
  db: DbClient;
  bucket: R2Bucket;
  organizationId: string;
  contactImportId: string;
};

export async function processContactImport(input: ProcessContactImportInput) {
  let fileKey: string | null = null;

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

    if (!importRecord.fileKey) {
      throw new Error('Contact import file key is missing.');
    }

    if (!importRecord.mapping) {
      throw new Error('Contact import mapping is missing.');
    }

    fileKey = importRecord.fileKey;
    const object = await input.bucket.get(fileKey);

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
    const accumulator = createContactImportAccumulator();

    for (const [index, rawValues] of rows.entries()) {
      const outcome = await classifyContactImportRow({
        db: input.db,
        organizationId: input.organizationId,
        rowNumber: index + 2,
        rawValues,
        mapping: importRecord.mapping,
        phoneCountryCode: importRecord.phoneCountryCode,
        accumulator,
      });

      if (outcome.action !== 'ready') {
        continue;
      }

      const row = outcome.row;
      const result = await upsertImportedContact(input.db, {
        organizationId: input.organizationId,
        name: row.name,
        phone: row.phone,
        email: row.email,
        normalizedPhone: row.normalizedPhone,
        normalizedEmail: row.normalizedEmail,
        phoneHash: row.phoneHash,
        emailHash: row.emailHash,
        lastBookingAt: row.lastBookingAt,
        consentStatus: 'granted',
        suppressed: row.suppressed,
      });

      if (result.action === 'conflict') {
        recordContactImportOutcome(accumulator, 'skipped', [
          'conflicting_contact_methods',
        ]);
      } else {
        recordContactImportOutcome(accumulator, result.action, [], {
          suppressed: row.suppressed,
        });
      }
    }

    await completeContactImport(input.db, {
      organizationId: input.organizationId,
      contactImportId: input.contactImportId,
      counts: accumulator.counts,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Contact import failed.';

    captureBackgroundError(error, {
      feature: 'contacts',
      operation: 'process_import',
      organizationId: input.organizationId,
      contactImportId: input.contactImportId,
    });

    await failContactImport(input.db, {
      organizationId: input.organizationId,
      contactImportId: input.contactImportId,
      error: message,
    });
  } finally {
    if (fileKey) {
      await deleteTemporaryImportFile(input.bucket, fileKey);
    }
  }
}
