"use client";

import { useQuery } from '@tanstack/react-query';
import type { ContactListResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { contactsQueryKeys } from '../query-keys';

export function useContactPresence({
  enabled,
  organizationId,
}: {
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: contactsQueryKeys.presence(organizationId ?? 'pending'),
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization is required to check contacts.');
      }

      return api.get<ContactListResponse>(
        '/v1/contacts?direction=desc&page=1&pageSize=1&sort=createdAt',
      );
    },
  });
}
