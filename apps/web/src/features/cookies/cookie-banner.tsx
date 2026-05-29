'use client';

import Link from 'next/link';
import {
  AnimatePresence,
  motion,
} from 'motion/react';

import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';

import { useCookieConsent } from './hooks/use-cookie-consent';
import { CookiePreferencesDialog } from './cookie-preferences-dialog';

export function CookieBanner() {
  const { consent, loaded, acceptAll, rejectAll, openPreferences } =
    useCookieConsent();
  const showBanner = loaded && consent === null;

  return (
    <>
      <AnimatePresence>
        {showBanner ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label="Cookie consent"
            aria-modal="false"
            className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-md rounded-lg border bg-background p-4 shadow-xl sm:right-6 sm:bottom-6"
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            role="dialog"
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <div className="flex flex-col gap-4">
              <p className={textStyles.mutedBody}>
                We use cookies and browser storage to make visits smoother,
                remember choices, and understand how the site is used. You can
                accept all cookies or keep only what is needed.{' '}
                <Link
                  className="text-foreground underline underline-offset-2"
                  href={routes.cookies}
                >
                  Cookie Policy
                </Link>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={rejectAll}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Essential only
                </Button>
                <Button
                  onClick={openPreferences}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Manage
                </Button>
                <Button onClick={acceptAll} size="sm" type="button">
                  Accept all
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CookiePreferencesDialog />
    </>
  );
}
