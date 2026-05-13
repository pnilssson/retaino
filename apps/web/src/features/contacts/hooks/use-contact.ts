"use client";

import { useQuery } from '@tanstack/react-query';
import type { ContactDetailResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { contactsQueryKeys } from '../query-keys';

export function useContact({
  contactId,
  enabled,
  organizationId,
}: {
  contactId: string;
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: contactsQueryKeys.detail(organizationId ?? 'pending', contactId),
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization is required to load a contact.');
      }

      return api.get<ContactDetailResponse>(`/v1/contacts/${contactId}`);
    },
  });
}
