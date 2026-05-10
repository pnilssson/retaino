"use client";

import Link from 'next/link';
import { useEmailCodeAuth } from '@/features/auth/hooks/use-email-code-auth';
import { routes } from '@/lib/routes';
import { CodeStep } from './code-step';
import { EmailStep } from './email-step';
import { RequirementsStep } from './requirements-step';

export function AuthForm() {
  const auth = useEmailCodeAuth();
  const formError =
    auth.error && auth.error.field !== 'email' && auth.error.field !== 'code'
      ? auth.error.message
      : null;

  return (
    <section className="mx-auto flex min-h-svh w-full max-w-[420px] flex-col px-5 py-8 sm:px-8">
      <div className="flex items-center lg:hidden">
        <span className="text-sm tracking-tight">retaino.</span>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <p className="text-sm text-muted-foreground">Secure workspace access</p>
        <h1 className="mt-3 max-w-sm text-2xl leading-snug text-foreground">
          Sign in with your work email.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We will send a one-time code.
        </p>

        <div className="mt-9">
          {auth.step === 'requirements' ? (
            <RequirementsStep auth={auth} formError={formError} />
          ) : auth.step === 'email' ? (
            <EmailStep auth={auth} />
          ) : (
            <CodeStep auth={auth} />
          )}

          {formError && auth.step !== 'requirements' ? (
            <p
              className="mt-5 border border-destructive/25 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div id="clerk-captcha" />
        </div>
      </div>

      <p className="text-center text-xs leading-5 text-muted-foreground">
        By continuing, you agree to Retaino&apos;s{' '}
        <Link
          className="text-foreground underline underline-offset-2"
          href={routes.terms}
        >
          terms and conditions
        </Link>{' '}
        and{' '}
        <Link
          className="text-foreground underline underline-offset-2"
          href={routes.privacy}
        >
          privacy policy
        </Link>
        .
      </p>
    </section>
  );
}
