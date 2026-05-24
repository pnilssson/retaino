"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CampaignSendResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useSendCampaign({
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

      return api.post<CampaignSendResponse>(
        `/v1/campaigns/${campaignId}/send`,
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
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: campaignsQueryKeys.detail(
            organizationId,
            response.campaign.id,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: campaignsQueryKeys.report(
            organizationId,
            response.campaign.id,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: campaignsQueryKeys.organization(organizationId),
        }),
      ]);
    },
  });
}
