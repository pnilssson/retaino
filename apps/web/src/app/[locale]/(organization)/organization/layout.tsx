import type { ReactNode } from 'react';
import { auth } from '@clerk/nextjs/server';
import { localizedPathname } from '@/i18n/paths';
import { routes } from '@/lib/routes';

export default async function OrganizationLayout({
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
    return redirectToSignIn({
      returnBackUrl: localizedPathname(routes.organizationSetup, locale)
    });
  }

  return <div className="flex min-h-svh flex-col bg-background">{children}</div>;
}
