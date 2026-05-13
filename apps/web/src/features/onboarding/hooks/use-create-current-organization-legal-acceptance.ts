"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateCurrentOrganizationLegalAcceptanceResponse,
  OrganizationSession,
} from '@retaino/shared/contracts';
import { useApi } from './use-api';
import { organizationSessionQueryKey } from './use-organization-session';

export function useCreateCurrentOrganizationLegalAcceptance() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<CreateCurrentOrganizationLegalAcceptanceResponse>(
        '/v1/organization/legal',
        {},
      ),
    onSuccess: async (data) => {
      queryClient.setQueryData<OrganizationSession>(
        organizationSessionQueryKey,
        (current) =>
          current
            ? {
                ...current,
                eligibility: data.eligibility,
                legalAcceptance: data.legalAcceptance,
                readiness: data.readiness,
              }
            : current,
      );
      await queryClient.invalidateQueries({
        queryKey: organizationSessionQueryKey,
      });
    },
  });
}
