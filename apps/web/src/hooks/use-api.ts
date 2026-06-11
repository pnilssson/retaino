"use client";

import { useAuth } from '@clerk/nextjs';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { createApiClient } from '@/lib/api-client';

export function useApi() {
  const { getToken } = useAuth();
  const locale = useLocale();

  return useMemo(() => createApiClient({ getToken, locale }), [getToken, locale]);
}
