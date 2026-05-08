export const COOKIE_CONSENT_STORAGE_KEY = 'retaino-cookie-consent';
const COOKIE_CONSENT_VERSION = '1';

export type CookieConsent = {
  analytics: boolean;
  timestamp: string;
  version: typeof COOKIE_CONSENT_VERSION;
};

export function createCookieConsent(
  analytics: boolean,
  date = new Date(),
): CookieConsent {
  return {
    analytics,
    timestamp: date.toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
}

export function parseStoredCookieConsent(value: string | null): CookieConsent | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<CookieConsent>;

    if (
      typeof parsed.analytics !== 'boolean' ||
      typeof parsed.timestamp !== 'string' ||
      parsed.version !== COOKIE_CONSENT_VERSION
    ) {
      return null;
    }

    return {
      analytics: parsed.analytics,
      timestamp: parsed.timestamp,
      version: parsed.version,
    };
  } catch {
    return null;
  }
}
