"use client";

import { useQuery } from '@tanstack/react-query';
import type { ContactListResponse } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';
import { contactsQueryKeys } from '../query-keys';

export function useContactPresence({
  enabled,
  organizationId,
}: {
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();
  const t = useTranslations('Contacts');

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: contactsQueryKeys.presence(organizationId ?? 'pending'),
    queryFn: () => {
      if (!organizationId) {
        throw new Error(t('organizationRequiredCheckContacts'));
      }

      return api.get<ContactListResponse>(
        '/v1/contacts?direction=desc&page=1&pageSize=1&sort=createdAt',
      );
    },
  });
}
