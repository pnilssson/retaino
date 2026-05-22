"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  BulkContactActionResponse,
  BulkContactIdsInput,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { contactsQueryKeys } from '../query-keys';

export function useBulkDeleteContacts(organizationId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: BulkContactIdsInput) =>
      api.post<BulkContactActionResponse>('/v1/contacts/bulk-delete', input),
    onSuccess: async (response) => {
      toast.success(`Deleted ${response.affectedCount} contacts`);
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
