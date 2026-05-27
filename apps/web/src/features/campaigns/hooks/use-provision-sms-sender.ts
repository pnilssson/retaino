"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  OrganizationSmsSenderResponse,
  ProvisionOrganizationSmsSenderInput,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { smsQueryKeys } from '../sms-query-keys';

export function useProvisionSmsSender(organizationId: string | null) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProvisionOrganizationSmsSenderInput) =>
      api.post<OrganizationSmsSenderResponse>('/v1/sms', input),
    onSuccess: async (response) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(smsQueryKeys.sender(organizationId), response);
      await queryClient.invalidateQueries({
        queryKey: smsQueryKeys.organization(organizationId),
      });
    },
  });
}
