"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CampaignLaunchResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useLaunchCampaign({
  campaignId,
  organizationId,
}: {
  campaignId: string | null;
  organizationId: string | null;
}) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!campaignId) {
        throw new Error('Choose a campaign before sending it.');
      }

      return api.post<CampaignLaunchResponse>(
        `/v1/campaigns/${campaignId}/launch`,
        {},
      );
    },
    onSuccess: async (response) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(
        campaignsQueryKeys.detail(organizationId, response.campaign.id),
        { campaign: response.campaign },
      );
      queryClient.setQueryData(
        campaignsQueryKeys.recipientSummary(
          organizationId,
          response.campaign.id,
        ),
        { recipientCount: response.recipientCount },
      );
      await queryClient.invalidateQueries({
        queryKey: campaignsQueryKeys.organization(organizationId),
      });
    },
  });
}
