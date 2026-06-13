import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';

import { AuthForm } from '@/features/auth/components/auth-form';
import { AuthProofPanel } from '@/features/auth/components/auth-proof-panel';
import { routes } from '@/lib/routes';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');

  return {
    title: t('signInTitle'),
    description: t('signInDescription'),
  };
}

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { isAuthenticated } = await auth({
    treatPendingAsSignedOut: false
  });

  if (isAuthenticated) {
    redirect({ href: routes.app, locale });
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-[1fr_1fr]" id="main-content">
      <AuthProofPanel />
      <AuthForm />
    </main>
  );
}
