"use client";

import { useQuery } from '@tanstack/react-query';
import type { InboxSummaryResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { inboxQueryKeys } from '../inbox-query-keys';

export function useInboxSummary({
  enabled,
  organizationId,
}: {
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: inboxQueryKeys.summary(organizationId ?? 'pending'),
    queryFn: () => api.get<InboxSummaryResponse>('/v1/inbox/summary'),
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}
