import {
  clerkMiddleware,
} from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { DEFAULT_LOCALE, isLocale } from '@retaino/shared';
import { routing } from '@/i18n/routing';
import { routes } from '@/lib/routes';

const handleI18nRouting = createIntlMiddleware(routing);

export default clerkMiddleware(
  async (auth, req) => {
    const localizedPath = getLocalizedPath(req.nextUrl.pathname);

    if (localizedPath.pathname === routes.app) {
      return NextResponse.redirect(
        new URL(withLocale(routes.overview, localizedPath.locale), req.url),
      );
    }

    if (isProtectedPath(localizedPath.pathname)) {
      const { isAuthenticated, redirectToSignIn } = await auth({
        treatPendingAsSignedOut: false
      });

      if (!isAuthenticated) {
        return redirectToSignIn({
          returnBackUrl: req.url,
        });
      }
    }

    return handleI18nRouting(req);
  },
  (req) => {
    const { locale } = getLocalizedPath(req.nextUrl.pathname);

    return {
      signInUrl: withLocale(routes.signIn, locale),
      signUpUrl: withLocale(routes.signIn, locale),
    };
  },
);

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};

function isProtectedPath(pathname: string) {
  return pathname === routes.app ||
    pathname.startsWith(`${routes.app}/`) ||
    pathname === '/organization' ||
    pathname.startsWith('/organization/');
}

function getLocalizedPath(pathname: string) {
  const [, maybeLocale, ...rest] = pathname.split('/');
  const locale = isLocale(maybeLocale) ? maybeLocale : DEFAULT_LOCALE;
  const pathWithoutLocale = isLocale(maybeLocale) ? `/${rest.join('/')}` : pathname;

  return {
    locale,
    pathname: pathWithoutLocale === '/' ? '/' : pathWithoutLocale.replace(/\/$/, ''),
  };
}

function withLocale(pathname: string, locale: string) {
  return `/${locale}${pathname === '/' ? '' : pathname}`;
}
