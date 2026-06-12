"use client";

import { useQuery } from '@tanstack/react-query';
import type { CampaignResponse } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCampaign({
  campaignId,
  enabled,
  organizationId,
}: {
  campaignId: string | null;
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();
  const t = useTranslations('Campaigns');

  return useQuery({
    enabled: enabled && Boolean(organizationId) && Boolean(campaignId),
    queryKey: campaignsQueryKeys.detail(
      organizationId ?? 'pending',
      campaignId ?? 'pending',
    ),
    queryFn: () => {
      if (!organizationId || !campaignId) {
        throw new Error(t('organizationCampaignRequired'));
      }

      return api.get<CampaignResponse>(`/v1/campaigns/${campaignId}`);
    },
  });
}
