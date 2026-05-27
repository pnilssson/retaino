"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CampaignResponse,
  UpdateCampaignDraftInput,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useUpdateCampaign({
  campaignId,
  organizationId,
}: {
  campaignId: string | null;
  organizationId: string | null;
}) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCampaignDraftInput) => {
      if (!campaignId) {
        throw new Error('Choose a campaign before saving changes.');
      }

      return api.request<CampaignResponse>(`/v1/campaigns/${campaignId}`, {
        body: input,
        method: 'PATCH',
      });
    },
    onSuccess: async (response) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(
        campaignsQueryKeys.detail(organizationId, response.campaign.id),
        response,
      );
      await queryClient.invalidateQueries({
        queryKey: campaignsQueryKeys.organization(organizationId),
      });
    },
  });
}
