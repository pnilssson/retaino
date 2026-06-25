'use client';

import {
  motion,
  useReducedMotion,
} from 'motion/react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const t = useTranslations('Marketing');

  return (
    <section className="bg-background px-3 py-6 sm:px-5">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="relative isolate overflow-hidden rounded-lg bg-primary"
          initial={{ opacity: 0, y: 18 }}
          transition={{
            delay: shouldReduceMotion ? 0 : 0.02,
            duration: shouldReduceMotion ? 0 : 0.6
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-6"
            style={{
              backgroundImage:
                'radial-gradient(circle at 76% 24%, rgb(255 255 255 / 0.18), transparent 32%), radial-gradient(circle at 60% 88%, rgb(80 220 170 / 0.24), transparent 34%), radial-gradient(circle at 22% 48%, rgb(255 255 255 / 0.08), transparent 28%)'
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-4 opacity-[0.14]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.5) 1px, transparent 0)',
              backgroundSize: '3px 3px'
            }}
          />

          <div className="relative z-10 flex min-h-[30rem] items-center px-5 py-8 sm:min-h-[35rem] sm:px-8 lg:min-h-[42rem] lg:px-20 xl:px-24">
            <div className="mx-auto flex max-w-[66rem] flex-col items-center text-center">
              <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  textStyles.h1,
                  'max-w-[24rem] text-white sm:max-w-[58rem] lg:max-w-[66rem]',
                )}
                initial={{ opacity: 0, y: 16 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.16,
                  duration: shouldReduceMotion ? 0 : 0.55
                }}
              >
                {t('heroTitle')}{' '}
                {t('heroMuted')}
              </motion.h1>

              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  textStyles.lead,
                  'mt-6 max-w-[30rem] text-white/72',
                )}
                initial={{ opacity: 0, y: 14 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.3,
                  duration: shouldReduceMotion ? 0 : 0.45
                }}
              >
                {t('heroSubheadline')}
              </motion.p>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-9 flex justify-center"
                initial={{ opacity: 0, y: 14 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.42,
                  duration: shouldReduceMotion ? 0 : 0.45
                }}
              >
                <Button
                  asChild
                  size="xl"
                  variant="outline"
                >
                  <Link href={routes.signIn} prefetch={false}>
                    {t('heroCta')}
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
