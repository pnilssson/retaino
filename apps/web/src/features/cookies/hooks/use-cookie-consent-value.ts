"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  createCookieConsent,
  parseStoredCookieConsent,
  type CookieConsent,
} from '@/features/cookies/consent-storage';
import type { CookieConsentContextValue } from './use-cookie-consent';

export function useCookieConsentValue(): CookieConsentContextValue {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      const stored = loadConsent();

      if (stored) {
        setConsent(stored);
      }

      setLoaded(true);
    });
  }, []);

  const persist = useCallback((next: CookieConsent) => {
    setConsent(next);
    saveConsent(next);
  }, []);

  const acceptAll = useCallback(() => {
    persist(createCookieConsent(true));
  }, [persist]);

  const rejectAll = useCallback(() => {
    persist(createCookieConsent(false));
  }, [persist]);

  const updateConsent = useCallback(
    (updates: Pick<CookieConsent, 'analytics'>) => {
      persist(createCookieConsent(updates.analytics));
    },
    [persist],
  );

  const openPreferences = useCallback(() => {
    setIsPreferencesOpen(true);
  }, []);

  return useMemo(
    () => ({
      acceptAll,
      consent,
      isPreferencesOpen,
      loaded,
      openPreferences,
      rejectAll,
      setIsPreferencesOpen,
      updateConsent,
    }),
    [
      acceptAll,
      consent,
      isPreferencesOpen,
      loaded,
      openPreferences,
      rejectAll,
      updateConsent,
    ],
  );
}

function saveConsent(consent: CookieConsent) {
  try {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify(consent),
    );
  } catch {
    return;
  }
}

function loadConsent() {
  try {
    return parseStoredCookieConsent(
      window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}
