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
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl">
        <div className="relative isolate w-screen overflow-hidden sm:w-auto">
          <div className="relative z-10 flex min-h-[33rem] items-center px-5 pb-16 pt-[5.5rem] sm:min-h-[34rem] sm:px-8 sm:py-[4.5rem] lg:min-h-[43rem] lg:px-20 lg:py-0 xl:px-24">
            <div className="max-w-[58rem]">
              <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className={cn('max-w-[22rem] sm:max-w-[50rem]', textStyles.displayTitle)}
                initial={{ opacity: 0, y: 16 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.08,
                  duration: shouldReduceMotion ? 0 : 0.55
                }}
              >
                {t('heroTitle')}{' '}
                <span className="text-muted-foreground">
                  {t('heroMuted')}
                </span>
              </motion.h1>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-9 flex flex-col items-start gap-2.5 sm:flex-row sm:items-stretch"
                initial={{ opacity: 0, y: 14 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.28,
                  duration: shouldReduceMotion ? 0 : 0.45
                }}
              >
                <Button asChild className="h-11 px-5" size="lg">
                  <Link href={routes.signIn} prefetch={false}>
                    {t('heroCta')}
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-11 bg-background px-5"
                  size="lg"
                  variant="outline"
                >
                  <Link href={routes.signIn} prefetch={false}>
                    {t('heroSecondaryCta')}
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
