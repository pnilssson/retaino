"use client";

import { useQuery } from '@tanstack/react-query';
import type { CampaignRecipientSearchResponse } from '@retaino/shared/contracts';
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
        throw new Error('Organization is required to search campaign recipients.');
      }

      const params = new URLSearchParams({ search: normalizedSearch });

      return api.get<CampaignRecipientSearchResponse>(
        `/v1/campaigns/${campaignId}/recipients/search?${params}`,
      );
    },
  });
}
