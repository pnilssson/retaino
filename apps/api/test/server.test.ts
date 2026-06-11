import { describe, expect, it } from 'vitest';
import { app } from '../src/server';

describe('api server', () => {
  it('serves operational health outside authenticated product routes', async () => {
    const response = await app.request('/health');

    await expect(response.json()).resolves.toEqual({
      name: 'retaino-api',
      status: 'ok',
    });
    expect(response.status).toBe(200);
  });

  it('serves Inngest from the versioned API outside Clerk auth', async () => {
    const response = await app.request('/v1/inngest', { method: 'PUT' });
    const body = await response.text();

    expect(response.status).not.toBe(401);
    expect(body).not.toContain('Authentication is required.');
  });

  it('allows the locale header during browser preflight requests', async () => {
    const response = await app.request('/v1/organization/session', {
      headers: {
        'Access-Control-Request-Headers':
          'authorization,content-type,x-retaino-locale',
        'Access-Control-Request-Method': 'GET',
        Origin: 'https://retaino.io',
      },
      method: 'OPTIONS',
    }, {
      APP_ALLOWED_ORIGINS: 'https://retaino.io',
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
      'x-retaino-locale',
    );
  });

  it('returns a structured JSON error for unknown routes', async () => {
    const response = await app.request('/missing');

    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'internal_error',
        message: 'Route not found.',
      },
    });
    expect(response.status).toBe(404);
  });
});
