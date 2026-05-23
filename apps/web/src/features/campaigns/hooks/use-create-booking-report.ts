"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateManualBookingReportInput,
  CreateManualBookingReportResponse,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { campaignsQueryKeys } from '../query-keys';

export function useCreateBookingReport({
  campaignId,
  organizationId,
}: {
  campaignId: string | null;
  organizationId: string | null;
}) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateManualBookingReportInput) => {
      if (!campaignId) {
        throw new Error('Choose a campaign before adding bookings.');
      }

      return api.post<CreateManualBookingReportResponse>(
        `/v1/campaigns/${campaignId}/booking-reports`,
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
