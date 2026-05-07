import { describe, expect, it } from 'vitest';
import app from './server';

describe('api server', () => {
  it('serves operational health outside authenticated product routes', async () => {
    const response = await app.request('/health');

    await expect(response.json()).resolves.toEqual({
      name: 'retaino-api',
      status: 'ok',
    });
    expect(response.status).toBe(200);
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
