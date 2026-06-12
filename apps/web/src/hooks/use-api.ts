"use client";

import { useAuth } from '@clerk/nextjs';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
import { useMemo } from 'react';
import { createApiClient } from '@/lib/api-client';

export function useApi() {
  const { getToken } = useAuth();
  const locale = useLocale();
  const t = useTranslations('Common');

  return useMemo(
    () =>
      createApiClient({
        errorMessage: t('apiRequestFailed'),
        getToken,
        locale,
      }),
    [getToken, locale, t],
  );
}
