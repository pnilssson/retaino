"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CampaignSendRequest,
  CampaignSendResponse,
} from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Campaigns');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CampaignSendRequest | undefined) => {
      if (!campaignId) {
        throw new Error(t('chooseCampaignBeforeSending'));
      }

      return api.post<CampaignSendResponse>(
        `/v1/campaigns/${campaignId}/send`,
        input ?? {},
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
