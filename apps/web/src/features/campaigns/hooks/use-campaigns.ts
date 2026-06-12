"use client";

import { useQuery } from '@tanstack/react-query';
import type { CampaignListResponse } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Campaigns');

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: campaignsQueryKeys.list(organizationId ?? 'pending'),
    queryFn: () => {
      if (!organizationId) {
        throw new Error(t('organizationRequiredLoadCampaigns'));
      }

      return api.get<CampaignListResponse>('/v1/campaigns');
    },
  });
}
