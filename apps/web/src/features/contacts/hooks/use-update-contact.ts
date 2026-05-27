"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  ContactDetailResponse,
  UpdateContactInput,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { invalidateContactDependentQueries } from '../contact-cache';
import { contactsQueryKeys } from '../query-keys';

export function useUpdateContact(
  organizationId: string,
  contactId: string,
  onSaved: () => void,
) {
  const api = useApi();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: UpdateContactInput) =>
      api.request<ContactDetailResponse>(`/v1/contacts/${contactId}`, {
        body: input,
        method: 'PATCH',
      }),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        contactsQueryKeys.detail(organizationId, contactId),
        response,
      );
      await invalidateContactDependentQueries(queryClient, organizationId);
      onSaved();
    },
  });

  return {
    error: mutation.error instanceof Error ? mutation.error.message : null,
    mutation,
  };
}
