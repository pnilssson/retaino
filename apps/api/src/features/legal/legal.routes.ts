import {
  getLatestPublishedLegalDocumentVersion,
  getPublishedLegalDocumentVersion,
} from '@retaino/db';
import { Hono } from 'hono';
import { apiError } from '../../lib/errors';
import type { AppEnv } from '../../types';

export const legalRoutes = new Hono<AppEnv>()
  .get('/:type', async (c) => {
    const legalDocument = await getLatestPublishedLegalDocumentVersion(
      c.get('db'),
      c.req.param('type'),
    );

    if (!legalDocument) {
      return c.json(
        apiError('not_found', 'Legal document was not found.'),
        404,
      );
    }

    return c.json({ legalDocument });
  })
  .get('/:type/:version', async (c) => {
    const legalDocument = await getPublishedLegalDocumentVersion(c.get('db'), {
      documentType: c.req.param('type'),
      documentVersion: c.req.param('version'),
    });

    if (!legalDocument) {
      return c.json(
        apiError('not_found', 'Legal document version was not found.'),
        404,
      );
    }

    return c.json({ legalDocument });
  });
