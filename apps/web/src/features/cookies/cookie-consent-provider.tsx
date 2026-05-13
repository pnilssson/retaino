'use client';

import type { ReactNode } from 'react';

import { CookieConsentContext } from '@/features/cookies/hooks/use-cookie-consent';
import { useCookieConsentValue } from '@/features/cookies/hooks/use-cookie-consent-value';

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const value = useCookieConsentValue();

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}
