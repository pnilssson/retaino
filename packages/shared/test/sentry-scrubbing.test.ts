import { describe, expect, it } from 'vitest';
import {
  createRetainoSentryDataCollection,
  sanitizeSentryUrl,
  scrubSentryEvent,
} from '../src/sentry-scrubbing';

describe('Sentry event scrubbing', () => {
  it('removes user identity, request payloads, sensitive headers, and URL details', () => {
    const sanitized = scrubSentryEvent({
      request: {
        url: 'https://retaino.io/app/inbox?email=ada@example.com#thread',
        headers: {
          authorization: 'Bearer secret',
          cookie: 'session=secret',
          'set-cookie': 'session=secret',
          'user-agent': 'Vitest',
        },
        data: {
          phone: '+46701111111',
          body: 'Hi Ada, book again',
        },
        cookies: {
          session: 'secret',
        },
      },
      user: {
        id: 'user_123',
        email: 'ada@example.com',
        ip_address: '172.69.235.159',
      },
    });

    expect(sanitized).not.toHaveProperty('user');
    expect(sanitized.request).toEqual({
      url: 'https://retaino.io/app/inbox',
      headers: {
        'user-agent': 'Vitest',
      },
    });
  });

  it('filters sensitive keys and embedded contact data recursively', () => {
    const sanitized = scrubSentryEvent({
      extra: {
        Email: 'ada@example.com',
        PhoneNumber: '0702244074',
        smsBody: 'Hi Ada',
        accessToken: 'secret',
        release: '1da928d7-f13f-4070-8f1f-fd3331fc175f',
        nested: {
          message: 'Provider failed for +46701111111 and ada@example.com',
        },
      },
      breadcrumbs: [
        {
          message: 'Reply failed for +46701111111',
          data: {
            token: 'secret',
          },
        },
      ],
    });

    expect(sanitized.extra).toEqual({
      Email: '[Filtered]',
      PhoneNumber: '[Filtered]',
      smsBody: '[Filtered]',
      accessToken: '[Filtered]',
      release: '1da928d7-f13f-4070-8f1f-fd3331fc175f',
      nested: {
        message: 'Provider failed for [Phone] and [Email]',
      },
    });
    expect(sanitized.breadcrumbs).toEqual([
      {
        message: 'Reply failed for [Phone]',
        data: {
          token: '[Filtered]',
        },
      },
    ]);
  });

  it('sanitizes URL query strings and fragments', () => {
    expect(
      sanitizeSentryUrl('https://retaino.io/app/inbox?email=ada@example.com#thread'),
    ).toBe('https://retaino.io/app/inbox');
    expect(sanitizeSentryUrl('not-a-url?email=ada@example.com')).toBe('not-a-url');
  });

  it('uses an explicit minimal Sentry data collection policy', () => {
    expect(createRetainoSentryDataCollection()).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: false,
        response: false,
      },
      httpBodies: [],
      queryParams: false,
      genAI: {
        inputs: false,
        outputs: false,
      },
      stackFrameVariables: false,
      frameContextLines: 0,
    });
  });
});
