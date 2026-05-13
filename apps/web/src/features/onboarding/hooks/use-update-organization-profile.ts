"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  UpdateOrganizationProfileInput,
  UpdateOrganizationProfileResponse,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { organizationSessionQueryKey } from './use-organization-session';

export function useUpdateOrganizationProfile() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOrganizationProfileInput) =>
      api.post<UpdateOrganizationProfileResponse>(
        '/v1/organization/profile',
        input
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationSessionQueryKey
      });
    }
  });
}
