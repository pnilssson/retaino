"use client";

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { fetchOverview } from '../overview-api';
import { overviewQueryKeys } from '../overview-query-keys';

export function useOverviewDashboard({
  enabled,
  organizationId,
}: {
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: overviewQueryKeys.dashboard(organizationId ?? 'pending'),
    queryFn: () => fetchOverview(api),
  });
}
