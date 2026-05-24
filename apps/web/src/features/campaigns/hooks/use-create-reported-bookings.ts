"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateReportedBookingsInput,
  CreateReportedBookingsResponse,
} from '@retaino/shared/contracts';
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReportedBookingsInput) => {
      if (!campaignId) {
        throw new Error('Choose a campaign before adding bookings.');
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
