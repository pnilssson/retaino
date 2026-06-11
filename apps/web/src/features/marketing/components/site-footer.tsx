'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { useCookieConsent } from '@/features/cookies/hooks/use-cookie-consent';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function SiteFooter() {
  const { openPreferences } = useCookieConsent();
  const tChrome = useTranslations('Chrome');
  const tMarketing = useTranslations('Marketing');
  const year = new Date().getFullYear();

  const linkClasses =
    'text-sm leading-6 text-primary-foreground/70 transition-colors hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-primary-foreground/40 focus-visible:outline-none';

  return (
    <footer className="bg-background px-3 pb-3 sm:px-5 sm:pb-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-lg bg-primary px-5 py-8 text-primary-foreground shadow-xl shadow-primary/20 ring-1 ring-primary-foreground/10 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Link
              aria-label={tChrome('homeLabel')}
              className={cn('flex items-center gap-2 text-primary-foreground', textStyles.brand)}
              href={routes.home}
            >
              <Image
                alt=""
                aria-hidden="true"
                className="size-5 brightness-0 invert"
                height={20}
                src="/brand/icons/retaino-icon-transparent.svg"
                width={20}
              />
            </Link>
            <p className="max-w-sm text-sm leading-6 text-primary-foreground/70">
              {tMarketing('tagline')}
            </p>
          </div>

          <nav aria-label={tChrome('legal')} className="flex flex-col gap-2">
            <Link className={linkClasses} href={routes.terms}>
              {tChrome('terms')}
            </Link>
            <Link className={linkClasses} href={routes.privacy}>
              {tChrome('privacyPolicy')}
            </Link>
            <Link className={linkClasses} href={routes.cookies}>
              {tChrome('cookiePolicy')}
            </Link>
            <button
              className={`${linkClasses} cursor-pointer text-left`}
              onClick={openPreferences}
              type="button"
            >
              {tChrome('cookiePreferences')}
            </button>
            <LocaleSwitcher
              className="w-fit px-0 text-primary-foreground/70 hover:bg-transparent hover:text-primary-foreground"
              variant="ghost"
            />
          </nav>
        </div>

        <p className="text-xs leading-5 text-primary-foreground/55">
          &copy; {year} Retaino. {tMarketing('footerCopyright')}
        </p>
      </div>
    </footer>
  );
}
