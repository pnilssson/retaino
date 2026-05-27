"use client";

import { useQuery } from '@tanstack/react-query';
import type { CampaignSmsTestContactSearchResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCampaignTestSmsContacts({
  campaignId,
  enabled,
  organizationId,
  search,
}: {
  campaignId: string | null;
  enabled: boolean;
  organizationId: string | null;
  search: string;
}) {
  const api = useApi();
  const normalizedSearch = search.trim();

  return useQuery({
    enabled: enabled && Boolean(organizationId) && Boolean(campaignId),
    queryKey: campaignsQueryKeys.testContactSearch(
      organizationId ?? 'pending',
      campaignId ?? 'pending',
      normalizedSearch,
    ),
    queryFn: () => {
      if (!organizationId || !campaignId) {
        throw new Error('Campaign is required to search test SMS contacts.');
      }

      const params = new URLSearchParams();

      if (normalizedSearch) {
        params.set('search', normalizedSearch);
      }

      const query = params.toString();

      return api.get<CampaignSmsTestContactSearchResponse>(
        `/v1/campaigns/${campaignId}/sms/test-contacts${query ? `?${query}` : ''}`,
      );
    },
  });
}
