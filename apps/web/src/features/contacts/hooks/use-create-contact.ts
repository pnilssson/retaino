"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateContactInput,
  CreateContactResponse,
} from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';
import { inboxQueryKeys } from '@/features/inbox/inbox-query-keys';
import { invalidateContactDependentQueries } from '../contact-cache';

export function useCreateContact({
  organizationId,
}: {
  organizationId: string | null;
}) {
  const api = useApi();
  const t = useTranslations('Contacts');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateContactInput) => {
      if (!organizationId) {
        throw new Error(t('organizationRequiredCreateContact'));
      }

      return api.post<CreateContactResponse>('/v1/contacts', input);
    },
    onSuccess: async () => {
      if (!organizationId) {
        return;
      }

      await Promise.all([
        invalidateContactDependentQueries(queryClient, organizationId),
        queryClient.invalidateQueries({
          queryKey: inboxQueryKeys.organization(organizationId),
        }),
      ]);
    },
  });
}
