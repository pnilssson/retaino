"use client";

import { useQuery } from '@tanstack/react-query';
import type { ContactDetailResponse } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Contacts');

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: contactsQueryKeys.detail(organizationId ?? 'pending', contactId),
    queryFn: () => {
      if (!organizationId) {
        throw new Error(t('organizationRequiredLoadContact'));
      }

      return api.get<ContactDetailResponse>(`/v1/contacts/${contactId}`);
    },
  });
}
