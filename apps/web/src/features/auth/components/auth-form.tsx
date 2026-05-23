"use client";

import Link from 'next/link';
import { ItemNotice } from '@/components/item-notice';
import { useEmailCodeAuth } from '@/features/auth/hooks/use-email-code-auth';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
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
        <p className={textStyles.meta}>Secure workspace access</p>
        <h1 className={cn('mt-3 max-w-sm', textStyles.pageTitle)}>
          Sign in with your work email.
        </h1>
        <p className={cn('mt-3', textStyles.mutedBody)}>
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
            <div className="mt-5">
              <ItemNotice
                description={formError}
                title="Sign in could not continue"
                variant="error"
              />
            </div>
          ) : null}

          <div id="clerk-captcha" />
        </div>
      </div>

      <p className={cn('text-center', textStyles.meta)}>
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
