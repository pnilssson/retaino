"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  BulkContactActionResponse,
  BulkSuppressContactsInput,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { contactsQueryKeys } from '../query-keys';

export function useBulkSuppressContacts() {
  const api = useApi();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: BulkSuppressContactsInput) =>
      api.post<BulkContactActionResponse>('/v1/contacts/bulk-suppressions', input),
    onSuccess: async (response) => {
      toast.success(`Suppressed ${response.affectedCount} contacts`, {
        description:
          response.skippedCount > 0
            ? `${response.skippedCount} skipped`
            : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: contactsQueryKeys.all });
    },
  });

  return {
    error: mutation.error instanceof Error ? mutation.error.message : null,
    mutation,
  };
}
