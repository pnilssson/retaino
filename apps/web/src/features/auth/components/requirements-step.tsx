"use client";

import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import type { useEmailCodeAuth } from '@/features/auth/hooks/use-email-code-auth';

type EmailCodeAuth = ReturnType<typeof useEmailCodeAuth>;

export function RequirementsStep({
  auth,
  formError,
}: {
  auth: EmailCodeAuth;
  formError: string | null;
}) {
  const t = useTranslations('Auth');

  return (
    <div className="grid gap-5">
      <ItemNotice
        description={
          formError ??
          t('requirementsDescription')
        }
        title={t('requirementsTitle')}
        variant="error"
      />
      <Button
        className="h-12 px-4"
        disabled={auth.isFetching}
        onClick={() => void auth.reset()}
        size="lg"
        type="button"
        variant="outline"
      >
        <Mail aria-hidden="true" data-icon="inline-start" />
        {t('useDifferentEmail')}
      </Button>
    </div>
  );
}
