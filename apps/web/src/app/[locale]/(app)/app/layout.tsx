import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { AppAuthenticatedShell } from '@/features/appshell/components/app-authenticated-shell';
import { localizedPathname } from '@/i18n/paths';
import { routes } from '@/lib/routes';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata();

export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { isAuthenticated, redirectToSignIn } = await auth({
    treatPendingAsSignedOut: false
  });

  if (!isAuthenticated) {
    return redirectToSignIn({ returnBackUrl: localizedPathname(routes.app, locale) });
  }

  return <AppAuthenticatedShell>{children}</AppAuthenticatedShell>;
}
