"use client";

import { useQuery } from '@tanstack/react-query';
import type { CampaignReportResponse } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCampaignReport({
  campaignId,
  enabled,
  organizationId,
  refetchInterval,
}: {
  campaignId: string | null;
  enabled: boolean;
  organizationId: string | null;
  refetchInterval?: false | number;
}) {
  const api = useApi();
  const t = useTranslations('Campaigns');

  return useQuery({
    enabled: enabled && Boolean(organizationId) && Boolean(campaignId),
    queryKey: campaignsQueryKeys.report(
      organizationId ?? 'pending',
      campaignId ?? 'pending',
    ),
    queryFn: () => {
      if (!organizationId || !campaignId) {
        throw new Error(t('organizationCampaignRequired'));
      }

      return api.get<CampaignReportResponse>(
        `/v1/campaigns/${campaignId}/report`,
      );
    },
    refetchInterval,
  });
}
