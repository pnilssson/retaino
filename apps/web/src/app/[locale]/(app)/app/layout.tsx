import type { ReactNode } from 'react';
import { auth } from '@clerk/nextjs/server';
import { AppAuthenticatedShell } from '@/features/appshell/components/app-authenticated-shell';
import { localizedPathname } from '@/i18n/paths';
import { routes } from '@/lib/routes';

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
