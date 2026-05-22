"use client";

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import type { OrganizationSession } from '@retaino/shared/contracts';
import { ApiClientError } from '@/lib/api-client';
import { useApi } from '@/hooks/use-api';

export const organizationSessionQueryKey = ['organization-session'] as const;
export const organizationSessionQueryKeys = {
  all: organizationSessionQueryKey,
  active: (organizationId: string) =>
    [...organizationSessionQueryKey, organizationId] as const,
};

export function useOrganizationSession(options: { enabled?: boolean } = {}) {
  const api = useApi();
  const { orgId } = useAuth({ treatPendingAsSignedOut: false });

  return useQuery({
    enabled: (options.enabled ?? true) && Boolean(orgId),
    queryKey: organizationSessionQueryKeys.active(orgId ?? 'pending'),
    queryFn: () => api.get<OrganizationSession>('/v1/organization/me'),
    retry: (failureCount, error) => {
      if (
        error instanceof ApiClientError &&
        error.code === 'active_organization_required'
      ) {
        return false;
      }

      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 2_000),
  });
}
