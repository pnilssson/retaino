"use client";

import { useQuery } from '@tanstack/react-query';
import type { SmsSenderNumbersResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { smsQueryKeys } from '../sms-query-keys';

export function useSmsSenderNumbers({
  countryCode,
  organizationId,
}: {
  countryCode: string;
  organizationId: string | null;
}) {
  const api = useApi();

  return useQuery({
    enabled: Boolean(organizationId && countryCode),
    queryKey: smsQueryKeys.numbers(organizationId ?? 'pending', {
      countryCode,
    }),
    queryFn: () => {
      const params = new URLSearchParams({
        countryCode,
      });

      return api.get<SmsSenderNumbersResponse>(
        `/v1/sms/numbers?${params.toString()}`,
      );
    },
  });
}
