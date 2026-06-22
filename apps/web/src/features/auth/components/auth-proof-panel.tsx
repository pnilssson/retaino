'use client';

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'motion/react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  useEffect,
  useState,
} from 'react';

import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

const quoteRotationInterval = 6500;

type Quote = {
  attributionKey: string;
  textKey: string;
};

const quotes = [
  {
    attributionKey: 'quoteProtectAttribution',
    textKey: 'quoteProtectText',
  },
  {
    attributionKey: 'quoteDriftAttribution',
    textKey: 'quoteDriftText',
  },
  {
    attributionKey: 'quoteConsentAttribution',
    textKey: 'quoteConsentText',
  },
  {
    attributionKey: 'quoteProofAttribution',
    textKey: 'quoteProofText',
  }
] satisfies readonly [Quote, ...Quote[]];

export function AuthProofPanel() {
  const chrome = useTranslations('Chrome');
  const t = useTranslations('Auth');
  const [activeQuote, setActiveQuote] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveQuote((current) => (current + 1) % quotes.length);
    }, quoteRotationInterval);

    return () => window.clearInterval(interval);
  }, [shouldReduceMotion]);

  const quote = quotes[activeQuote] ?? quotes[0];
  const verticalOffset = shouldReduceMotion ? 0 : 8;

  return (
    <aside className="relative hidden min-h-svh bg-background p-3 pr-0 lg:flex">
      <div className="relative flex min-h-[calc(100svh-1.5rem)] flex-1 items-center justify-center overflow-hidden rounded-sm bg-[oklch(0.205_0.028_178)] px-12 py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6"
          style={{
            backgroundImage:
              'radial-gradient(circle at 78% 28%, rgb(255 255 255 / 0.18), transparent 34%), radial-gradient(circle at 68% 76%, rgb(80 220 170 / 0.24), transparent 30%), radial-gradient(circle at 28% 52%, rgb(255 255 255 / 0.08), transparent 26%)'
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

        <Link
          aria-label={chrome('homeLabel')}
          className="absolute left-8 top-8 flex items-center text-white"
          href={routes.home}
        >
          <Image
            alt=""
            aria-hidden="true"
            className="size-9 brightness-0 invert"
            height={36}
            priority
            src="/brand/icons/retaino-icon-transparent.svg"
            width={36}
          />
        </Link>

        <div className="relative mx-auto flex min-h-48 max-w-[430px] items-center px-6 text-center">
          <AnimatePresence initial={false} mode="wait">
            <motion.figure
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
              exit={{ opacity: 0, y: -verticalOffset }}
              initial={{ opacity: 0, y: verticalOffset }}
              key={quote.textKey}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.5,
                ease: 'easeOut'
              }}
            >
              <blockquote className={cn(textStyles.h2, 'text-white')}>
                {t(quote.textKey)}
              </blockquote>
              <figcaption className={cn('mt-6', textStyles.p, 'text-white/75')}>
                {t(quote.attributionKey)}
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
