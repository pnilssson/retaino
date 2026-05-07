import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/features/auth/components/auth-form';
import { AuthProofPanel } from '@/features/auth/components/auth-proof-panel';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Sign in | Retaino',
  description: 'Sign in to continue setting up Retaino.'
};

export default async function SignInPage() {
  const { isAuthenticated } = await auth({
    treatPendingAsSignedOut: false
  });

  if (isAuthenticated) {
    redirect(routes.app);
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-[1fr_1fr]">
      <AuthProofPanel />
      <AuthForm />
    </main>
  );
}
