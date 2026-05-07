'use client';

import Link from 'next/link';

import { useCookieConsent } from '@/features/cookies/cookie-consent-provider';
import { routes } from '@/lib/routes';

export function SiteFooter() {
  const { openPreferences } = useCookieConsent();
  const year = new Date().getFullYear();

  const linkClasses =
    'text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-8 lg:px-10">
        <div className="flex flex-col gap-2">
          <Link
            aria-label="Retaino home"
            className="text-base tracking-tight text-foreground"
            href={routes.home}
          >
            retaino.
          </Link>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Reactivate previous customers and measure recovered bookings.
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            &copy; {year} Retaino. All rights reserved.
          </p>
        </div>

        <nav aria-label="Legal" className="flex flex-col gap-2 sm:items-end">
          <Link className={linkClasses} href={routes.terms}>
            Terms and Conditions
          </Link>
          <Link className={linkClasses} href={routes.privacy}>
            Privacy Policy
          </Link>
          <Link className={linkClasses} href={routes.cookies}>
            Cookie Policy
          </Link>
          <button
            className={`${linkClasses} cursor-pointer text-left sm:text-right`}
            onClick={openPreferences}
            type="button"
          >
            Cookie preferences
          </button>
        </nav>
      </div>
    </footer>
  );
}
