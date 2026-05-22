import {
  createContactImport,
  createContactSuppression,
  deleteContact,
  deleteContactSuppression,
  deleteContacts,
  failContactImport,
  getContactById,
  getContactImportById,
  listContacts,
  suppressContacts,
  updateContact,
} from '@retaino/db';
import {
  bulkContactIdsSchema,
  bulkSuppressContactsSchema,
  contactImportStartSchema,
  contactListQuerySchema,
  createContactSuppressionSchema,
  updateContactSchema,
} from '@retaino/shared/contracts';
import { parse } from 'csv-parse/sync';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { apiError } from '../../lib/errors';
import { parseJsonBody } from '../../lib/route-helpers';
import type { AppEnv } from '../../types';
import { requireContactImportEligibility } from '../organization/organization.gates';
import { deleteTemporaryImportFile } from './contact-import-storage';
import { enqueueContactImportProcessing } from './contacts.jobs';

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 1024 * 1024;
const MAX_UPLOAD_REQUEST_SIZE = MAX_UPLOAD_SIZE + MAX_MULTIPART_OVERHEAD;
const CSV_VALIDATION_SAMPLE_BYTES = 64 * 1024;

export const contactsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    const parsed = contactListQuerySchema.safeParse(c.req.query());

    if (!parsed.success) {
      return c.json(
        apiError(
          'validation_failed',
          'Invalid contacts query.',
          z.treeifyError(parsed.error),
        ),
        400,
      );
    }

    return c.json(
      await listContacts(c.get('db'), {
        organizationId: c.get('organization').id,
        query: parsed.data,
      }),
    );
  })
  .post('/bulk-delete', async (c) => {
    const parsed = await parseJsonBody(
      c,
      bulkContactIdsSchema,
      'Invalid bulk delete request.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const affectedCount = await deleteContacts(c.get('db'), {
      organizationId: c.get('organization').id,
      contactIds: parsed.data.contactIds,
    });

    return c.json({
      requestedCount: parsed.data.contactIds.length,
      affectedCount,
      skippedCount: parsed.data.contactIds.length - affectedCount,
    });
  })
  .post('/bulk-suppressions', async (c) => {
    const parsed = await parseJsonBody(
      c,
      bulkSuppressContactsSchema,
      'Invalid bulk suppression request.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const result = await suppressContacts(c.get('db'), {
      organizationId: c.get('organization').id,
      contactIds: parsed.data.contactIds,
      type: parsed.data.type,
    });

    return c.json({
      requestedCount: parsed.data.contactIds.length,
      affectedCount: result.affectedCount,
      skippedCount: result.skippedCount,
    });
  })
  .get('/:id', async (c) => {
    const contact = await getContactById(c.get('db'), {
      organizationId: c.get('organization').id,
      contactId: c.req.param('id'),
    });

    if (!contact) {
      return c.json(apiError('not_found', 'Contact was not found.'), 404);
    }

    return c.json({ contact });
  })
  .patch('/:id', async (c) => {
    const parsed = await parseJsonBody(
      c,
      updateContactSchema,
      'Invalid contact update.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const result = await updateContact(c.get('db'), {
      organizationId: c.get('organization').id,
      contactId: c.req.param('id'),
      input: parsed.data,
    });

    if (result.status === 'not_found') {
      return c.json(apiError('not_found', 'Contact was not found.'), 404);
    }

    if (result.status === 'invalid_phone') {
      return c.json(
        apiError('validation_failed', 'Enter a valid phone number.'),
        400,
      );
    }

    if (result.status === 'invalid_email') {
      return c.json(
        apiError('validation_failed', 'Enter a valid email address.'),
        400,
      );
    }

    if (result.status === 'duplicate') {
      return c.json(
        apiError(
          'validation_failed',
          'Another contact already uses that phone or email.',
        ),
        409,
      );
    }

    return c.json({ contact: result.contact });
  })
  .delete('/:id', async (c) => {
    const deleted = await deleteContact(c.get('db'), {
      organizationId: c.get('organization').id,
      contactId: c.req.param('id'),
    });

    if (!deleted) {
      return c.json(apiError('not_found', 'Contact was not found.'), 404);
    }

    return c.body(null, 204);
  })
  .post('/:id/suppressions', async (c) => {
    const parsed = await parseJsonBody(
      c,
      createContactSuppressionSchema,
      'Invalid suppression request.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const result = await createContactSuppression(c.get('db'), {
      organizationId: c.get('organization').id,
      contactId: c.req.param('id'),
      type: parsed.data.type,
    });

    if (result.status === 'not_found') {
      return c.json(apiError('not_found', 'Contact was not found.'), 404);
    }

    if (result.status === 'missing_method') {
      return c.json(
        apiError('validation_failed', 'That contact method is not available.'),
        400,
      );
    }

    return c.json(
      { contact: result.contact },
      result.status === 'created' ? 201 : 200,
    );
  })
  .delete('/:id/suppressions/:suppressionId', async (c) => {
    const result = await deleteContactSuppression(c.get('db'), {
      organizationId: c.get('organization').id,
      contactId: c.req.param('id'),
      suppressionId: c.req.param('suppressionId'),
    });

    if (result.status === 'not_found') {
      return c.json(apiError('not_found', 'Suppression was not found.'), 404);
    }

    return c.json({ contact: result.contact });
  })
  .post('/imports', async (c) => {
    const gate = await requireContactImportEligibility(c);

    if (!gate.ok) {
      return gate.response;
    }

    const contentLength = parseContentLength(c.req.header('content-length'));

    if (contentLength && contentLength > MAX_UPLOAD_REQUEST_SIZE) {
      return c.json(
        apiError('validation_failed', 'CSV uploads are limited to 25 MB.'),
        400,
      );
    }

    const form = await c.req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return c.json(apiError('validation_failed', 'Upload a CSV file.'), 400);
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return c.json(
        apiError('validation_failed', 'CSV uploads are limited to 25 MB.'),
        400,
      );
    }

    const startInput = parseImportStartForm(form);

    if (!startInput.ok) {
      return c.json(
        apiError(
          'validation_failed',
          'Invalid import request.',
          startInput.error,
        ),
        400,
      );
    }

    const csvSample = await file.slice(0, CSV_VALIDATION_SAMPLE_BYTES).text();

    if (!isValidCsv(csvSample)) {
      return c.json(
        apiError('validation_failed', 'CSV file could not be parsed.'),
        400,
      );
    }

    const organization = c.get('organization');
    const storageId = crypto.randomUUID();
    const fileKey = `organizations/${organization.id}/contact-imports/${storageId}/source.csv`;

    await c.env.CONTACT_IMPORTS_BUCKET.put(fileKey, file, {
      httpMetadata: { contentType: file.type || 'text/csv' },
      customMetadata: { organizationId: organization.id },
    });

    const importRow = await createAndEnqueueContactImport(c, {
      fileKey,
      mapping: startInput.data.mapping,
      phoneCountryCode: startInput.data.phoneCountryCode,
    });

    if (!importRow.ok) {
      return c.json(
        apiError('internal_error', 'Failed to start contact import.'),
        500,
      );
    }

    return c.json({ import: importRow.import }, 202);
  })
  .get('/imports/:id', async (c) => {
    const importRow = await getContactImportById(c.get('db'), {
      organizationId: c.get('organization').id,
      contactImportId: c.req.param('id'),
    });

    if (!importRow) {
      return c.json(apiError('not_found', 'Contact import was not found.'), 404);
    }

    return c.json({ import: importRow });
  });

async function createAndEnqueueContactImport(
  c: Context<AppEnv>,
  input: {
    fileKey: string;
    mapping: z.infer<typeof contactImportStartSchema>['mapping'];
    phoneCountryCode: string;
  },
) {
  const organization = c.get('organization');
  let contactImportId: string | null = null;

  try {
    const importRow = await createContactImport(c.get('db'), {
      organizationId: organization.id,
      createdByUserId: c.get('user').id,
      fileKey: input.fileKey,
      mapping: input.mapping,
      phoneCountryCode: input.phoneCountryCode,
      permissionAttestedByUserId: c.get('user').id,
    });

    if (!importRow) {
      throw new Error('Failed to create contact import.');
    }

    contactImportId = importRow.id;

    await enqueueContactImportProcessing(c.env, {
      organizationId: organization.id,
      contactImportId: importRow.id,
      userId: c.get('user').id,
    });

    return { ok: true, import: importRow };
  } catch (error) {
    await deleteTemporaryImportFile(c.env.CONTACT_IMPORTS_BUCKET, input.fileKey);

    if (contactImportId) {
      await failContactImport(c.get('db'), {
        organizationId: organization.id,
        contactImportId,
        error:
          error instanceof Error
            ? error.message
            : 'Contact import failed to start.',
      });
    }

    return { ok: false };
  }
}

function parseContentLength(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseImportStartForm(form: FormData):
  | { ok: true; data: z.infer<typeof contactImportStartSchema> }
  | { ok: false; error: unknown } {
  const mapping = parseMapping(form.get('mapping'));
  const parsed = contactImportStartSchema.safeParse({
    mapping: mapping.ok ? mapping.value : undefined,
    phoneCountryCode: form.get('phoneCountryCode'),
    permissionAttestation: form.get('permissionAttestation') === 'true',
  });

  if (!mapping.ok) {
    return { ok: false, error: { mapping: 'Mapping must be valid JSON.' } };
  }

  if (!parsed.success) {
    return { ok: false, error: z.treeifyError(parsed.error) };
  }

  return { ok: true, data: parsed.data };
}

function parseMapping(value: FormDataEntryValue | null):
  | { ok: true; value: unknown }
  | { ok: false } {
  if (typeof value !== 'string') {
    return { ok: false };
  }

  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

function isValidCsv(text: string) {
  try {
    parse(text, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
      to_line: 2,
    });

    return true;
  } catch {
    return false;
  }
}
