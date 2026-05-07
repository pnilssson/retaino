import { describe, expect, it } from 'vitest';

import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
  createCookieConsent,
  parseStoredCookieConsent,
} from './consent-storage';

describe('cookie consent storage', () => {
  it('creates versioned consent records with the selected analytics setting', () => {
    const consent = createCookieConsent(true, new Date('2026-05-07T12:00:00.000Z'));

    expect(COOKIE_CONSENT_STORAGE_KEY).toBe('retaino-cookie-consent');
    expect(consent).toEqual({
      analytics: true,
      timestamp: '2026-05-07T12:00:00.000Z',
      version: COOKIE_CONSENT_VERSION,
    });
  });

  it('parses valid stored consent and rejects stale or invalid values', () => {
    const stored = JSON.stringify({
      analytics: false,
      timestamp: '2026-05-07T12:00:00.000Z',
      version: COOKIE_CONSENT_VERSION,
    });

    expect(parseStoredCookieConsent(stored)).toEqual({
      analytics: false,
      timestamp: '2026-05-07T12:00:00.000Z',
      version: COOKIE_CONSENT_VERSION,
    });
    expect(parseStoredCookieConsent(null)).toBeNull();
    expect(parseStoredCookieConsent('not json')).toBeNull();
    expect(
      parseStoredCookieConsent(
        JSON.stringify({
          analytics: false,
          timestamp: '2026-05-07T12:00:00.000Z',
          version: 'stale',
        }),
      ),
    ).toBeNull();
  });
});
