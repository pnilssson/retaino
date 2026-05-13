"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ContactDetailResponse,
  CreateContactSuppressionInput,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { contactsQueryKeys } from '../query-keys';

export function useSuppressContact(organizationId: string, contactId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: CreateContactSuppressionInput) =>
      api.post<ContactDetailResponse>(
        `/v1/contacts/${contactId}/suppressions`,
        input,
      ),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        contactsQueryKeys.detail(organizationId, contactId),
        response,
      );
      await queryClient.invalidateQueries({
        queryKey: contactsQueryKeys.organization(organizationId),
      });
    },
  });

  return {
    error: mutation.error instanceof Error ? mutation.error.message : null,
    mutation,
  };
}
