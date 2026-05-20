"use client";

import { useQuery } from '@tanstack/react-query';
import type { CampaignReportResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCampaignReport({
  campaignId,
  enabled,
  organizationId,
}: {
  campaignId: string | null;
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();

  return useQuery({
    enabled: enabled && Boolean(organizationId) && Boolean(campaignId),
    queryKey: campaignsQueryKeys.report(
      organizationId ?? 'pending',
      campaignId ?? 'pending',
    ),
    queryFn: () => {
      if (!organizationId || !campaignId) {
        throw new Error('Organization and campaign are required.');
      }

      return api.get<CampaignReportResponse>(
        `/v1/campaigns/${campaignId}/report`,
      );
    },
  });
}
