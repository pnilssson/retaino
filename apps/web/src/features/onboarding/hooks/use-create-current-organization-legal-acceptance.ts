"use client";

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateCurrentOrganizationLegalAcceptanceResponse,
  OrganizationSession,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import {
  organizationSessionQueryKey,
  organizationSessionQueryKeys,
} from './use-organization-session';

export function useCreateCurrentOrganizationLegalAcceptance() {
  const api = useApi();
  const { orgId } = useAuth({ treatPendingAsSignedOut: false });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<CreateCurrentOrganizationLegalAcceptanceResponse>(
        '/v1/organization/legal',
        {},
      ),
    onSuccess: async (data) => {
      if (orgId) {
        queryClient.setQueryData<OrganizationSession>(
          organizationSessionQueryKeys.active(orgId),
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
      }

      await queryClient.invalidateQueries({
        queryKey: organizationSessionQueryKey,
      });
    },
  });
}
