"use client";

import { useQuery } from '@tanstack/react-query';
import type { OrganizationSmsSenderResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { smsQueryKeys } from '../sms-query-keys';

export function useSmsSender(organizationId: string | null) {
  const api = useApi();

  return useQuery({
    enabled: Boolean(organizationId),
    queryKey: smsQueryKeys.sender(organizationId ?? 'pending'),
    queryFn: () => api.get<OrganizationSmsSenderResponse>('/v1/sms'),
  });
}
