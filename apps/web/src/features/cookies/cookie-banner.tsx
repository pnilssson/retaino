'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'motion/react';

import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';

import { useCookieConsent } from './hooks/use-cookie-consent';
import { CookiePreferencesDialog } from './cookie-preferences-dialog';

export function CookieBanner() {
  const t = useTranslations('Cookies');
  const { consent, loaded, acceptAll, rejectAll, openPreferences } =
    useCookieConsent();
  const shouldReduceMotion = useReducedMotion();
  const showBanner = loaded && consent === null;
  const hiddenState = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.98, y: 12 };
  const exitState = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.98, y: 8 };

  return (
    <>
      <AnimatePresence>
        {showBanner ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label={t('bannerLabel')}
            aria-modal="false"
            className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-md rounded-lg border bg-background p-4 shadow-xl sm:right-6 sm:bottom-6"
            exit={exitState}
            initial={hiddenState}
            role="dialog"
            transition={{
              duration: shouldReduceMotion ? 0 : 0.24,
              ease: 'easeOut',
            }}
          >
            <div className="flex flex-col gap-4">
              <p className={textStyles.mutedP}>
                {t('bannerDescription')}{' '}
                <Link
                  className="text-foreground underline underline-offset-2"
                  href={routes.cookies}
                >
                  {t('policy')}
                </Link>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={rejectAll}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t('essentialOnly')}
                </Button>
                <Button
                  onClick={openPreferences}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t('manage')}
                </Button>
                <Button onClick={acceptAll} size="sm" type="button">
                  {t('acceptAll')}
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
