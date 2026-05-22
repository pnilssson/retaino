"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateContactImportResponse,
  CsvMapping,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { invalidateContactDependentQueries } from '../contact-cache';

type StartContactImportInput = {
  file: File;
  mapping: CsvMapping;
  permissionAttestation: boolean;
  phoneCountryCode: string;
};

export function useStartContactImport({
  onSuccess,
  organizationId,
}: {
  onSuccess: (response: CreateContactImportResponse) => void;
  organizationId: string;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (value: StartContactImportInput) => {
      const body = new FormData();
      body.set('file', value.file);
      body.set('mapping', JSON.stringify(value.mapping));
      body.set('phoneCountryCode', value.phoneCountryCode);
      body.set(
        'permissionAttestation',
        value.permissionAttestation ? 'true' : 'false',
      );

      return api.upload<CreateContactImportResponse>('/v1/contacts/imports', {
        body,
      });
    },
    onSuccess: async (response) => {
      await invalidateContactDependentQueries(queryClient, organizationId);
      onSuccess(response);
    },
  });

  return {
    error: mutation.error instanceof Error ? mutation.error.message : null,
    mutation,
  };
}
