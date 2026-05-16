"use client";

import { useQuery } from '@tanstack/react-query';
import type {
  CampaignAudiencePreviewResponse,
  CampaignAudienceRule,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCampaignAudiencePreview({
  audienceRule,
  enabled,
  organizationId,
}: {
  audienceRule: CampaignAudienceRule;
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: campaignsQueryKeys.audiencePreview(
      organizationId ?? 'pending',
      audienceRule,
    ),
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization is required to preview an audience.');
      }

      return api.post<CampaignAudiencePreviewResponse>(
        '/v1/campaigns/audience-preview',
        { audienceRule },
      );
    },
  });
}
