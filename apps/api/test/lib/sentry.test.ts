import type { ErrorEvent } from '@sentry/cloudflare';
import { describe, expect, it, vi } from 'vitest';
import {
  captureHandledError,
  createSentryOptions,
} from '../../src/lib/sentry';

vi.mock('@sentry/cloudflare', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe('Sentry helpers', () => {
  it('builds disabled-safe Cloudflare options when no DSN is configured', () => {
    const options = createSentryOptions({});

    expect(options.dsn).toBeUndefined();
    expect(options.enabled).toBe(false);
    expect(options.environment).toBe('development');
    expect(options.sendDefaultPii).toBe(false);
    expect(options.skipOpenTelemetrySetup).toBe(true);
    expect(options).not.toHaveProperty('tracesSampleRate');
  });

  it('defaults deployed Worker events to production', () => {
    const options = createSentryOptions({
      SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
      CF_VERSION_METADATA: { id: 'worker-version-id' } as never,
    });

    expect(options.environment).toBe('production');
    expect(options.release).toBe('worker-version-id');
  });

  it('keeps enriched manual error capture as the only Hono error capture path', () => {
    const options = createSentryOptions({});
    expect(typeof options.integrations).toBe('function');

    if (typeof options.integrations !== 'function') {
      throw new Error('Expected Sentry integrations to be filtered.');
    }

    const integrations = options.integrations([
      { name: 'Hono' },
      { name: 'Console' },
      { name: 'Fetch' },
    ] as never);

    expect(integrations).toEqual([{ name: 'Fetch' }]);
  });

  it('scrubs request and customer data before sending events', () => {
    const options = createSentryOptions({
      SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
      SENTRY_ENVIRONMENT: 'production',
    });
    const event = {
      type: undefined,
      request: {
        url: 'https://api.retaino.io/v1/sms/countries?countryCode=SE&email=ada@example.com',
        headers: {
          authorization: 'Bearer secret',
          cookie: 'session=secret',
          'user-agent': 'Vitest',
        },
        data: {
          phone: '+46701111111',
          body: 'Hi Ada, book again',
        },
      },
      extra: {
        email: 'ada@example.com',
        phoneNumber: '0702244074',
        smsBody: 'Hi Ada',
        release: '1da928d7-f13f-4070-8f1f-fd3331fc175f',
        nested: {
          message: 'Provider failed for +46701111111 and ada@example.com',
        },
      },
      user: {
        ip_address: '172.69.235.159',
      },
    } satisfies ErrorEvent;

    const sanitized = options.beforeSend?.(event, {}) as ErrorEvent | null;

    expect(sanitized?.request?.url).toBe('https://api.retaino.io/v1/sms/countries');
    expect(sanitized?.request?.headers).toEqual({
      'user-agent': 'Vitest',
    });
    expect(sanitized?.request).not.toHaveProperty('data');
    expect(sanitized).not.toHaveProperty('user');
    expect(sanitized?.extra).toEqual({
      email: '[Filtered]',
      phoneNumber: '[Filtered]',
      smsBody: '[Filtered]',
      release: '1da928d7-f13f-4070-8f1f-fd3331fc175f',
      nested: {
        message: 'Provider failed for [Phone] and [Email]',
      },
    });
  });

  it('captures handled errors with route and organization context', async () => {
    const { captureException } = await import('@sentry/cloudflare');
    const error = new Error('Provider failed.');
    const context = {
      req: {
        method: 'GET',
        path: '/v1/sms/countries',
        url: 'https://api.retaino.io/v1/sms/countries?countryCode=SE',
      },
      get: vi.fn().mockReturnValue({
        id: '22222222-2222-4222-8222-222222222222',
      }),
    };

    captureHandledError(error, context as never, {
      feature: 'sms',
      operation: 'sender_numbers',
      httpStatus: 429,
    });

    expect(captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({
          feature: 'sms',
          operation: 'sender_numbers',
          route: '/v1/sms/countries',
          method: 'GET',
          http_status: '429',
          organization_id: '22222222-2222-4222-8222-222222222222',
        }),
      }),
    );
  });
});
