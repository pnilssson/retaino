"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useDeleteCampaignDraft(organizationId: string | null) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) =>
      api.request<void>(`/v1/campaigns/${campaignId}`, { method: 'DELETE' }),
    onSuccess: async (_response, campaignId) => {
      if (!organizationId) {
        return;
      }

      queryClient.removeQueries({
        queryKey: campaignsQueryKeys.detail(organizationId, campaignId),
      });
      await queryClient.invalidateQueries({
        queryKey: campaignsQueryKeys.organization(organizationId),
      });
    },
  });
}

export function useDeleteCampaignDrafts(organizationId: string | null) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignIds: string[]) =>
      Promise.all(
        campaignIds.map((campaignId) =>
          api.request<void>(`/v1/campaigns/${campaignId}`, {
            method: 'DELETE',
          }),
        ),
      ),
    onSuccess: async (_response, campaignIds) => {
      if (!organizationId) {
        return;
      }

      for (const campaignId of campaignIds) {
        queryClient.removeQueries({
          queryKey: campaignsQueryKeys.detail(organizationId, campaignId),
        });
      }

      await queryClient.invalidateQueries({
        queryKey: campaignsQueryKeys.organization(organizationId),
      });
    },
  });
}
