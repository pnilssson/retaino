"use client";

import {
  Ban,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBulkDeleteContacts } from '@/features/contacts/hooks/use-bulk-delete-contacts';
import { useBulkSuppressContacts } from '@/features/contacts/hooks/use-bulk-suppress-contacts';

export function ContactBulkActions({
  contactIds,
  onClear,
  organizationId,
  selectedCount,
}: {
  contactIds: string[];
  onClear: () => void;
  organizationId: string;
  selectedCount: number;
}) {
  const t = useTranslations('Contacts');
  const common = useTranslations('Common');
  const bulkDelete = useBulkDeleteContacts(organizationId);
  const bulkSuppress = useBulkSuppressContacts(organizationId);
  const isPending =
    bulkDelete.mutation.isPending || bulkSuppress.mutation.isPending;
  const hasSelection = selectedCount > 0;

  async function suppressSelectedContacts() {
    if (!hasSelection) {
      return;
    }

    try {
      await bulkSuppress.mutation.mutateAsync({ contactIds, type: 'phone' });
      onClear();
    } catch (error) {
      toast.error(t('bulkSuppressErrorTitle'), {
        description:
          error instanceof Error ? error.message : common('tryAgainSoon'),
      });
    }
  }

  async function deleteSelectedContacts() {
    if (!hasSelection) {
      return;
    }

    try {
      await bulkDelete.mutation.mutateAsync({ contactIds });
      onClear();
    } catch (error) {
      toast.error(t('bulkDeleteErrorTitle'), {
        description:
          error instanceof Error ? error.message : common('tryAgainSoon'),
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('openContactActions')}
          disabled={!hasSelection || isPending}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <ConfirmDialog
          confirmLabel={t('suppressSms')}
          description={t('bulkSuppressDescription')}
          isPending={bulkSuppress.mutation.isPending}
          onConfirm={suppressSelectedContacts}
          title={t('bulkSuppressTitle')}
          trigger={
            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
              <Ban aria-hidden="true" />
              {t('suppressSms')}
            </DropdownMenuItem>
          }
        />
        <ConfirmDialog
          confirmLabel={t('deleteContacts')}
          description={t('bulkDeleteDescription')}
          isPending={bulkDelete.mutation.isPending}
          onConfirm={deleteSelectedContacts}
          title={t('bulkDeleteTitle')}
          trigger={
            <DropdownMenuItem
              onSelect={(event) => event.preventDefault()}
              variant="destructive"
            >
              <Trash2 aria-hidden="true" />
              {t('delete')}
            </DropdownMenuItem>
          }
          variant="destructive"
        />
        <DropdownMenuLabel>{t('selectedCount', { count: selectedCount })}</DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
