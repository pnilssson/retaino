"use client";

import { useQuery } from '@tanstack/react-query';
import type { CampaignListResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCampaigns({
  enabled,
  organizationId,
}: {
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: campaignsQueryKeys.list(organizationId ?? 'pending'),
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization is required to load campaigns.');
      }

      return api.get<CampaignListResponse>('/v1/campaigns');
    },
  });
}
