"use client";

import { useQuery } from '@tanstack/react-query';
import type { InboxSummaryResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { INBOX_REFETCH_INTERVAL_MS } from '../inbox-polling';
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
    staleTime: INBOX_REFETCH_INTERVAL_MS,
    refetchInterval: INBOX_REFETCH_INTERVAL_MS,
  });
}
