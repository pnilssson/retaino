"use client";

import { useQuery } from '@tanstack/react-query';
import type { CampaignRecipientSearchResponse } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCampaignRecipientSearch({
  campaignId,
  organizationId,
  search,
}: {
  campaignId: string;
  organizationId: string | null;
  search: string;
}) {
  const api = useApi();
  const t = useTranslations('Campaigns');
  const normalizedSearch = search.trim();

  return useQuery({
    enabled:
      Boolean(organizationId) &&
      Boolean(campaignId) &&
      normalizedSearch.length >= 2,
    queryKey: campaignsQueryKeys.recipientSearch(
      organizationId ?? 'pending',
      campaignId,
      normalizedSearch,
    ),
    queryFn: () => {
      if (!organizationId) {
        throw new Error(t('organizationRequiredSearchRecipients'));
      }

      const params = new URLSearchParams({ search: normalizedSearch });

      return api.get<CampaignRecipientSearchResponse>(
        `/v1/campaigns/${campaignId}/recipients/search?${params}`,
      );
    },
  });
}
