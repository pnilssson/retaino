"use client";

import { useQuery } from '@tanstack/react-query';
import { ApiClientError } from '@/lib/api-client';
import { useApi } from './use-api';
import type { OrganizationSession } from '../types';

export const organizationSessionQueryKey = ['organization-session'] as const;

export function useOrganizationSession(options: { enabled?: boolean } = {}) {
  const api = useApi();

  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: organizationSessionQueryKey,
    queryFn: () => api.get<OrganizationSession>('/v1/me'),
    retry: (failureCount, error) => {
      if (
        error instanceof ApiClientError &&
        error.code === 'active_organization_required'
      ) {
        return false;
      }

      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 2_000)
  });
}
