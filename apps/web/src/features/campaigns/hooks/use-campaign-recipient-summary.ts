"use client";

import { useQuery } from '@tanstack/react-query';
import type { CampaignRecipientSummaryResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCampaignRecipientSummary({
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
    queryKey: campaignsQueryKeys.recipientSummary(
      organizationId ?? 'pending',
      campaignId ?? 'pending',
    ),
    queryFn: () => {
      if (!organizationId || !campaignId) {
        throw new Error('Organization and campaign are required.');
      }

      return api.get<CampaignRecipientSummaryResponse>(
        `/v1/campaigns/${campaignId}/recipients/summary`,
      );
    },
  });
}
