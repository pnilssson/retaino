import {
  createContactSuppression,
  createContactImport,
  deleteContact,
  deleteContactSuppression,
  getCurrentRequiredLegalDocumentVersions,
  getContactById,
  getContactImportById,
  getOrganizationCountryCode,
  getOrganizationProfileByOrganizationId,
  listContactImportRows,
  listContactImports,
  listContacts,
  listOrganizationAcceptedDocuments,
  markContactImportProcessing,
  updateContact,
} from '@retaino/db';
import {
  canManageOrganizationSetup,
  createContactSuppressionSchema,
  contactImportListQuerySchema,
  contactImportProcessSchema,
  contactImportRowsQuerySchema,
  contactListQuerySchema,
  updateContactSchema,
  type ContactImportPreview,
} from '@retaino/shared/contracts';
import { parse } from 'csv-parse/sync';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { apiError } from '../../lib/errors';
import { parseJsonBody } from '../../lib/route-helpers';
import type { AppEnv } from '../../types';
import {
  csvAllowedHeaders,
  csvSensitiveHeaderWarnings,
  csvValuesForHeaders,
} from './contacts.csv';
import { enqueueContactImportProcessing } from './contacts.jobs';

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const PREVIEW_ROWS = 5;

export const contactsRoutes = new Hono<AppEnv>()
  .get('/contacts', async (c) => {
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
  .get('/contacts/:id', async (c) => {
    const contact = await getContactById(c.get('db'), {
      organizationId: c.get('organization').id,
      contactId: c.req.param('id'),
    });

    if (!contact) {
      return c.json(apiError('not_found', 'Contact was not found.'), 404);
    }

    return c.json({ contact });
  })
  .patch('/contacts/:id', async (c) => {
    const gate = validateContactManagementPermission(c);

    if (!gate.ok) {
      return gate.response;
    }

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
  .delete('/contacts/:id', async (c) => {
    const gate = validateContactManagementPermission(c);

    if (!gate.ok) {
      return gate.response;
    }

    const deleted = await deleteContact(c.get('db'), {
      organizationId: c.get('organization').id,
      contactId: c.req.param('id'),
    });

    if (!deleted) {
      return c.json(apiError('not_found', 'Contact was not found.'), 404);
    }

    return c.body(null, 204);
  })
  .post('/contacts/:id/suppressions', async (c) => {
    const gate = validateContactManagementPermission(c);

    if (!gate.ok) {
      return gate.response;
    }

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
  .delete('/contacts/:id/suppressions/:suppressionId', async (c) => {
    const gate = validateContactManagementPermission(c);

    if (!gate.ok) {
      return gate.response;
    }

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
  .get('/contact-imports', async (c) => {
    const parsed = contactImportListQuerySchema.safeParse(c.req.query());

    if (!parsed.success) {
      return c.json(
        apiError(
          'validation_failed',
          'Invalid import query.',
          z.treeifyError(parsed.error),
        ),
        400,
      );
    }

    return c.json(
      await listContactImports(c.get('db'), {
        organizationId: c.get('organization').id,
        query: parsed.data,
      }),
    );
  })
  .post('/contact-imports', async (c) => {
    const gate = await validateImportGate(c);

    if (!gate.ok) {
      return gate.response;
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

    const buffer = await file.arrayBuffer();
    const preview = safeParseCsvPreview(new TextDecoder().decode(buffer));

    if (!preview.ok) {
      return c.json(
        apiError('validation_failed', 'CSV file could not be parsed.'),
        400,
      );
    }

    const organization = c.get('organization');
    const storageId = crypto.randomUUID();
    const fileKey = `organizations/${organization.id}/contact-imports/${storageId}/source.csv`;
    const phoneCountryCode = await getOrganizationCountryCode(
      c.get('db'),
      organization.id,
    );
    const contentType = file.type || 'text/csv';

    await c.env.CONTACT_IMPORTS_BUCKET.put(fileKey, buffer, {
      httpMetadata: { contentType },
      customMetadata: { organizationId: organization.id },
    });

    const importRow = await createContactImport(c.get('db'), {
      organizationId: organization.id,
      createdByUserId: c.get('user').id,
      fileKey,
      filename: file.name,
      fileSize: file.size,
      contentType,
      checksum: await sha256(buffer),
      source: normalizedFormString(form.get('source')),
      phoneCountryCode,
      preview: preview.value,
    });

    if (!importRow) {
      return c.json(
        apiError('internal_error', 'Failed to create contact import.'),
        500,
      );
    }

    return c.json({ import: importRow, preview: preview.value }, 201);
  })
  .get('/contact-imports/:id', async (c) => {
    const importRow = await getContactImportById(c.get('db'), {
      organizationId: c.get('organization').id,
      contactImportId: c.req.param('id'),
    });

    if (!importRow) {
      return c.json(apiError('not_found', 'Contact import was not found.'), 404);
    }

    return c.json({ import: importRow });
  })
  .post('/contact-imports/:id/process', async (c) => {
    const gate = await validateImportGate(c);

    if (!gate.ok) {
      return gate.response;
    }

    const parsed = await parseJsonBody(
      c,
      contactImportProcessSchema,
      'Invalid import mapping.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const organization = c.get('organization');
    const transition = await markContactImportProcessing(c.get('db'), {
      organizationId: organization.id,
      contactImportId: c.req.param('id'),
      mapping: parsed.data.mapping,
      phoneCountryCode: parsed.data.phoneCountryCode,
    });

    if (transition.status === 'not_found') {
      return c.json(apiError('not_found', 'Contact import was not found.'), 404);
    }

    if (transition.status === 'invalid_status') {
      return c.json(
        apiError(
          'validation_failed',
          'Contact import has already started processing.',
        ),
        409,
      );
    }

    const importRow = transition.import;

    await enqueueContactImportProcessing(c.env, {
      organizationId: organization.id,
      contactImportId: importRow.id,
      userId: c.get('user').id,
    });

    return c.json({ import: importRow }, 202);
  })
  .get('/contact-imports/:id/rows', async (c) => {
    const parsed = contactImportRowsQuerySchema.safeParse(c.req.query());

    if (!parsed.success) {
      return c.json(
        apiError(
          'validation_failed',
          'Invalid import rows query.',
          z.treeifyError(parsed.error),
        ),
        400,
      );
    }

    return c.json(
      await listContactImportRows(c.get('db'), {
        organizationId: c.get('organization').id,
        contactImportId: c.req.param('id'),
        query: parsed.data,
      }),
    );
  });

function validateContactManagementPermission(c: Context<AppEnv>) {
  if (!canManageOrganizationSetup(c.get('organization').role)) {
    return {
      ok: false as const,
      response: c.json(
        apiError('forbidden', 'Only organization admins can manage contacts.'),
        403,
      ),
    };
  }

  return { ok: true as const };
}

async function validateImportGate(c: Context<AppEnv>) {
  const organization = c.get('organization');

  if (!canManageOrganizationSetup(organization.role)) {
    return {
      ok: false as const,
      response: c.json(
        apiError('forbidden', 'Only organization admins can import contacts.'),
        403,
      ),
    };
  }

  const db = c.get('db');
  const profile = await getOrganizationProfileByOrganizationId(db, organization.id);

  if (!profile) {
    return {
      ok: false as const,
      response: c.json(
        apiError(
          'forbidden',
          'Organization setup must be complete before importing contacts.',
        ),
        403,
      ),
    };
  }

  const acceptedDocuments = await listOrganizationAcceptedDocuments(
    db,
    organization.id,
  );
  const currentRequiredDocuments =
    await getCurrentRequiredLegalDocumentVersions(db);
  const acceptedVersions = new Set(
    acceptedDocuments.map(
      (document) => `${document.documentType}:${document.documentVersion}`,
    ),
  );
  const complianceComplete = currentRequiredDocuments.every((document) =>
    acceptedVersions.has(`${document.documentType}:${document.documentVersion}`),
  );

  if (!complianceComplete) {
    return {
      ok: false as const,
      response: c.json(
        apiError(
          'forbidden',
          'Compliance setup must be complete before importing contacts.',
        ),
        403,
      ),
    };
  }

  return { ok: true as const };
}

function parseCsvPreview(text: string): ContactImportPreview {
  const records = parse(text, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
    to_line: PREVIEW_ROWS + 1,
  }) as string[][];
  const [headerRow = [], ...sampleValueRows] = records;
  const allHeaders = headerRow.map((header) => header.trim()).filter(Boolean);
  const headers = csvAllowedHeaders(allHeaders);
  const sampleRows = sampleValueRows.slice(0, PREVIEW_ROWS).map((values) =>
    csvValuesForHeaders(allHeaders, values, headers),
  );

  return {
    headers,
    sampleRows,
    warnings: csvSensitiveHeaderWarnings(allHeaders),
  };
}

function safeParseCsvPreview(text: string):
  | { ok: true; value: ContactImportPreview }
  | { ok: false } {
  try {
    return { ok: true, value: parseCsvPreview(text) };
  } catch {
    return { ok: false };
  }
}

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizedFormString(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
