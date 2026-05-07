import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLatestPublishedLegalDocumentVersion,
  getPublishedLegalDocumentVersion,
} from '@retaino/db';
import type { LegalDocumentVersion } from '@retaino/shared/contracts';
import { legalRoutes } from './legal.routes';
import type { AppEnv } from '../../types';

vi.mock('@retaino/db', () => ({
  getLatestPublishedLegalDocumentVersion: vi.fn(),
  getPublishedLegalDocumentVersion: vi.fn(),
}));

const publishedDocument: LegalDocumentVersion = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  legalDocumentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  documentType: 'terms',
  slug: 'terms',
  title: 'Retaino Terms and Conditions',
  documentVersion: '2026-05-07',
  effectiveDate: '2026-05-07',
  bodyMdx: '# Retaino Terms and Conditions',
  contentHash: 'a'.repeat(64),
  publicVisible: true,
  acceptanceRequired: true,
  sortOrder: 10,
  publishedAt: '2026-05-07T00:00:00.000Z',
  createdAt: '2026-05-07T00:00:00.000Z',
  updatedAt: '2026-05-07T00:00:00.000Z',
};

function testApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    await next();
  });

  app.route('/v1/legal', legalRoutes);
  return app;
}

describe('legalRoutes', () => {
  beforeEach(() => {
    vi.mocked(getLatestPublishedLegalDocumentVersion).mockReset();
    vi.mocked(getPublishedLegalDocumentVersion).mockReset();
  });

  it('returns the latest published document by type', async () => {
    vi.mocked(getLatestPublishedLegalDocumentVersion).mockResolvedValue(
      publishedDocument,
    );

    const response = await testApp().request('/v1/legal/terms');

    expect(response.status).toBe(200);
    expect(getLatestPublishedLegalDocumentVersion).toHaveBeenCalledWith(
      expect.anything(),
      'terms',
    );
    await expect(response.json()).resolves.toEqual({
      legalDocument: publishedDocument,
    });
  });

  it('returns an exact immutable published version', async () => {
    vi.mocked(getPublishedLegalDocumentVersion).mockResolvedValue(
      publishedDocument,
    );

    const response = await testApp().request('/v1/legal/terms/2026-05-07');

    expect(response.status).toBe(200);
    expect(getPublishedLegalDocumentVersion).toHaveBeenCalledWith(
      expect.anything(),
      {
        documentType: 'terms',
        documentVersion: '2026-05-07',
      },
    );
  });

  it('returns 404 for unknown document types or versions', async () => {
    vi.mocked(getPublishedLegalDocumentVersion).mockResolvedValue(null);

    const response = await testApp().request('/v1/legal/missing/2026-05-07');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'not_found',
        message: 'Legal document version was not found.',
      },
    });
  });
});
