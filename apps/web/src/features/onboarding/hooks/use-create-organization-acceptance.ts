"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';
import { organizationSessionQueryKey } from './use-organization-session';
import type {
  CreateOrganizationAcceptanceInput,
  CreateOrganizationAcceptanceResponse
} from '../types';

export function useCreateOrganizationAcceptance() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganizationAcceptanceInput) =>
      api.post<CreateOrganizationAcceptanceResponse>(
        '/v1/organization/acceptances',
        input
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationSessionQueryKey
      });
    }
  });
}
