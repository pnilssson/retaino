"use client";

import { useQuery } from '@tanstack/react-query';
import type { SmsSenderCountriesResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { smsQueryKeys } from '@/lib/sms-query-keys';

export function useSmsSenderCountries(organizationId: string | null) {
  const api = useApi();

  return useQuery({
    enabled: Boolean(organizationId),
    queryKey: smsQueryKeys.countries(organizationId ?? 'pending'),
    queryFn: () => api.get<SmsSenderCountriesResponse>('/v1/sms/countries'),
  });
}
