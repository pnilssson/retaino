"use client";

import { useMutation } from '@tanstack/react-query';
import type {
  CampaignSmsTestSendRequest,
  CampaignSmsTestSendResponse,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';

export function useSendCampaignTestSms(campaignId: string | null) {
  const api = useApi();

  return useMutation({
    mutationFn: (input: CampaignSmsTestSendRequest) => {
      if (!campaignId) {
        throw new Error('Save the campaign before sending a test SMS.');
      }

      return api.post<CampaignSmsTestSendResponse>(
        `/v1/campaigns/${campaignId}/sms/send`,
        input,
      );
    },
  });
}
