"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  BulkContactActionResponse,
  BulkSuppressContactsInput,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { invalidateContactDependentQueries } from '../contact-cache';

export function useBulkSuppressContacts(organizationId: string) {
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
      await invalidateContactDependentQueries(queryClient, organizationId);
    },
  });

  return {
    error: mutation.error instanceof Error ? mutation.error.message : null,
    mutation,
  };
}
