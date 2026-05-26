'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useCookieConsent } from '@/features/cookies/hooks/use-cookie-consent';
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
            className="flex items-center gap-2 text-base tracking-tight text-foreground"
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
            retaino.
          </Link>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Bring back previous clients and report recovered bookings.
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
