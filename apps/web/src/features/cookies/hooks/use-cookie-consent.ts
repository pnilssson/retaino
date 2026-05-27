"use client";

import {
  createContext,
  useContext,
} from 'react';
import type { CookieConsent } from '@/features/cookies/consent-storage';

export type CookieConsentContextValue = {
  acceptAll: () => void;
  consent: CookieConsent | null;
  isPreferencesOpen: boolean;
  loaded: boolean;
  openPreferences: () => void;
  rejectAll: () => void;
  setIsPreferencesOpen: (open: boolean) => void;
  updateConsent: (updates: Pick<CookieConsent, 'analytics'>) => void;
};

export const CookieConsentContext =
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
