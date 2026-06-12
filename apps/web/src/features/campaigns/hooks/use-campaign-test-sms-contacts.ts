"use client";

import { useQuery } from '@tanstack/react-query';
import type { CampaignSmsTestContactSearchResponse } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Campaigns');
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
        throw new Error(t('campaignRequiredSearchTestContacts'));
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
