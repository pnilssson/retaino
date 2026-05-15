"use client";

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContactImportDetailResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { contactsQueryKeys } from '../query-keys';

export function useContactImport({
  importId,
  organizationId,
}: {
  importId: string;
  organizationId: string;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const importQuery = useQuery({
    queryKey: contactsQueryKeys.importDetail(organizationId, importId),
    queryFn: () =>
      api.get<ContactImportDetailResponse>(`/v1/contacts/imports/${importId}`),
    refetchInterval: (query) =>
      query.state.data?.import.status === 'processing' ? 1500 : false,
  });
  const latestImport = importQuery.data?.import ?? null;

  useEffect(() => {
    if (latestImport?.status === 'completed') {
      void queryClient.invalidateQueries({
        queryKey: contactsQueryKeys.organization(organizationId),
      });
    }
  }, [latestImport?.status, organizationId, queryClient]);

  return {
    importQuery,
    latestImport,
  };
}
