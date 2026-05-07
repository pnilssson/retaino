"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';
import { organizationSessionQueryKey } from './use-organization-session';
import type {
  CreateCurrentOrganizationAcceptancesInput,
  CreateCurrentOrganizationAcceptancesResponse,
  OrganizationSession
} from '../types';

export function useCreateCurrentOrganizationAcceptances() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCurrentOrganizationAcceptancesInput) =>
      api.post<CreateCurrentOrganizationAcceptancesResponse>(
        '/v1/organization/acceptances/current',
        input
      ),
    onSuccess: async (data) => {
      queryClient.setQueryData<OrganizationSession>(
        organizationSessionQueryKey,
        (current) =>
          current
            ? {
                ...current,
                acceptedDocuments: data.acceptedDocuments,
                readiness: data.readiness
              }
            : current
      );
      await queryClient.invalidateQueries({
        queryKey: organizationSessionQueryKey
      });
    }
  });
}
