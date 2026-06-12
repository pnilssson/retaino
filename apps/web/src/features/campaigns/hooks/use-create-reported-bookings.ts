"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateReportedBookingsInput,
  CreateReportedBookingsResponse,
} from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCreateReportedBookings({
  campaignId,
  organizationId,
}: {
  campaignId: string | null;
  organizationId: string | null;
}) {
  const api = useApi();
  const t = useTranslations('Campaigns');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReportedBookingsInput) => {
      if (!campaignId) {
        throw new Error(t('chooseCampaignBeforeAddingBookings'));
      }

      return api.post<CreateReportedBookingsResponse>(
        `/v1/campaigns/${campaignId}/reported-bookings`,
        input,
      );
    },
    onSuccess: async () => {
      if (!organizationId || !campaignId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: campaignsQueryKeys.report(organizationId, campaignId),
      });
    },
  });
}
