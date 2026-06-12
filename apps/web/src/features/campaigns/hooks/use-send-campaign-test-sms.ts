"use client";

import { useMutation } from '@tanstack/react-query';
import type {
  CampaignSmsTestSendRequest,
  CampaignSmsTestSendResponse,
} from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';

export function useSendCampaignTestSms(campaignId: string | null) {
  const api = useApi();
  const t = useTranslations('Campaigns');

  return useMutation({
    mutationFn: (input: CampaignSmsTestSendRequest) => {
      if (!campaignId) {
        throw new Error(t('saveCampaignBeforeTestSms'));
      }

      return api.post<CampaignSmsTestSendResponse>(
        `/v1/campaigns/${campaignId}/sms/send`,
        input,
      );
    },
  });
}
