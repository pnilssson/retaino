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
  const footerLinkClasses = cn(
    textStyles.mutedP,
    'transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
  );

  return (
    <footer className="border-t border-border/60 bg-background px-3 sm:px-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 border-x border-border/60 px-5 py-8 text-foreground sm:px-8 lg:px-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Link
              aria-label={tChrome('homeLabel')}
              className="flex items-center gap-2 text-foreground"
              href={routes.home}
            >
              <Image
                alt=""
                aria-hidden="true"
                className="size-5"
                height={20}
                src="/brand/icons/retaino-icon-transparent.svg"
                width={20}
              />
            </Link>
            <p className={cn('max-w-sm', textStyles.mutedP)}>
              {tMarketing('tagline')}
            </p>
          </div>

          <nav aria-label={tChrome('legal')} className="flex flex-col gap-2">
            <Link className={footerLinkClasses} href={routes.terms}>
              {tChrome('terms')}
            </Link>
            <Link className={footerLinkClasses} href={routes.privacy}>
              {tChrome('privacyPolicy')}
            </Link>
            <Link className={footerLinkClasses} href={routes.cookies}>
              {tChrome('cookiePolicy')}
            </Link>
            <button
              className={cn(
                'cursor-pointer text-left',
                footerLinkClasses,
              )}
              onClick={openPreferences}
              type="button"
            >
              {tChrome('cookiePreferences')}
            </button>
            <LocaleSwitcher
              className={cn(
                'w-fit data-[state=open]:bg-muted',
                textStyles.mutedP,
              )}
              variant="ghost"
            />
          </nav>
        </div>

        <p className={textStyles.small}>
          &copy; {year} Retaino. {tMarketing('footerCopyright')}
        </p>
      </div>
    </footer>
  );
}
