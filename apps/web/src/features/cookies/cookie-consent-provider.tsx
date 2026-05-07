'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  COOKIE_CONSENT_STORAGE_KEY,
  createCookieConsent,
  parseStoredCookieConsent,
  type CookieConsent,
} from '@/features/cookies/consent-storage';

type CookieConsentContextValue = {
  acceptAll: () => void;
  consent: CookieConsent | null;
  isPreferencesOpen: boolean;
  loaded: boolean;
  openPreferences: () => void;
  rejectAll: () => void;
  setIsPreferencesOpen: (open: boolean) => void;
  updateConsent: (updates: Pick<CookieConsent, 'analytics'>) => void;
};

const CookieConsentContext =
  createContext<CookieConsentContextValue | null>(null);

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);

  if (!context) {
    throw new Error(
      'useCookieConsent must be used inside CookieConsentProvider',
    );
  }

  return context;
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

export function CookieConsentProvider({ children }: { children: ReactNode }) {
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

  const value = useMemo(
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

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}
