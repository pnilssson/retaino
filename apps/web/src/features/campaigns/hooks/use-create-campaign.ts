"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CampaignResponse,
  CreateCampaignDraftInput,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCreateCampaign(organizationId: string | null) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCampaignDraftInput) =>
      api.post<CampaignResponse>('/v1/campaigns', input),
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
