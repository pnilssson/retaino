import type { ReactNode } from 'react';
import { auth } from '@clerk/nextjs/server';
import { routes } from '@/lib/routes';

export default async function OrganizationLayout({
  children
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, redirectToSignIn } = await auth({
    treatPendingAsSignedOut: false
  });

  if (!isAuthenticated) {
    return redirectToSignIn({ returnBackUrl: routes.organizationSetup });
  }

  return <div className="flex min-h-svh flex-col bg-background">{children}</div>;
}
