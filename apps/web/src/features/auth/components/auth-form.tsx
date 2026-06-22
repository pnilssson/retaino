"use client";

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ItemNotice } from '@/components/item-notice';
import { useEmailCodeAuth } from '@/features/auth/hooks/use-email-code-auth';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { CodeStep } from './code-step';
import { EmailStep } from './email-step';
import { RequirementsStep } from './requirements-step';

export function AuthForm() {
  const chrome = useTranslations('Chrome');
  const t = useTranslations('Auth');
  const auth = useEmailCodeAuth();
  const formError =
    auth.error && auth.error.field !== 'email' && auth.error.field !== 'code'
      ? auth.error.message
      : null;

  return (
    <section className="mx-auto flex min-h-svh w-full max-w-[420px] flex-col px-5 py-8 sm:px-8">
      <div className="flex items-center lg:hidden">
        <Link aria-label={chrome('homeLabel')} href={routes.home}>
          <Image
            alt=""
            aria-hidden="true"
            className="size-9"
            height={36}
            priority
            src="/brand/icons/retaino-icon-transparent.svg"
            width={36}
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <h1 className={cn('mt-3 max-w-sm', textStyles.h2)}>
          {t('title')}
        </h1>

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
                title={t('formErrorTitle')}
                variant="error"
              />
            </div>
          ) : null}

          <div id="clerk-captcha" />
        </div>
      </div>

      <p className={cn('text-center', textStyles.small)}>
        {t('agreementPrefix')}{' '}
        <Link
          className="text-foreground underline underline-offset-2"
          href={routes.terms}
        >
          {t('agreementTerms')}
        </Link>{' '}
        {t('agreementAnd')}{' '}
        <Link
          className="text-foreground underline underline-offset-2"
          href={routes.privacy}
        >
          {t('agreementPrivacy')}
        </Link>
        .
      </p>
    </section>
  );
}
