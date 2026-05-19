"use client";

import { useQuery } from '@tanstack/react-query';
import type {
  SmsSenderNumbersResponse,
  SmsSenderNumberType,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { smsQueryKeys } from '../sms-query-keys';

export function useSmsSenderNumbers({
  countryCode,
  numberType,
  organizationId,
}: {
  countryCode: string;
  numberType: SmsSenderNumberType | null;
  organizationId: string | null;
}) {
  const api = useApi();

  return useQuery({
    enabled: Boolean(organizationId && countryCode && numberType),
    queryKey: smsQueryKeys.numbers(organizationId ?? 'pending', {
      countryCode,
      numberType,
    }),
    queryFn: () => {
      const params = new URLSearchParams({
        countryCode,
      });

      if (numberType) {
        params.set('numberType', numberType);
      }

      return api.get<SmsSenderNumbersResponse>(
        `/v1/sms/numbers?${params.toString()}`,
      );
    },
  });
}
