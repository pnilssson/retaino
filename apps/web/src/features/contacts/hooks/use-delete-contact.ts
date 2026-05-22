"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { ApiClientError } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { invalidateContactDependentQueries } from '../contact-cache';
import { contactsQueryKeys } from '../query-keys';

export function useDeleteContact(organizationId: string, contactId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: () =>
      api.request<void>(`/v1/contacts/${contactId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      queryClient.removeQueries({
        queryKey: contactsQueryKeys.detail(organizationId, contactId),
      });
      await invalidateContactDependentQueries(queryClient, organizationId);
      router.push(routes.contacts);
    },
  });

  return {
    error:
      mutation.error instanceof ApiClientError || mutation.error instanceof Error
        ? mutation.error.message
        : null,
    mutation,
  };
}
