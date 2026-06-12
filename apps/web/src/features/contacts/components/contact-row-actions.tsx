"use client";

import type { Contact } from '@retaino/shared/contracts';
import {
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteContact } from '@/features/contacts/hooks/use-delete-contact';
import { routes } from '@/lib/routes';

export function ContactRowActions({ contact }: { contact: Contact }) {
  const t = useTranslations('Contacts');
  const common = useTranslations('Common');
  const deleteContact = useDeleteContact(contact.organizationId, contact.id, {
    redirectOnSuccess: false,
  });
  const contactName = contact.name ?? t('unnamedContact');

  async function handleDeleteContact() {
    try {
      await deleteContact.mutation.mutateAsync();
      toast.success(t('contactDeleted'));
    } catch (error) {
      toast.error(t('contactDeleteErrorTitle'), {
        description:
          error instanceof Error ? error.message : common('tryAgainSoon'),
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('openActionsForContact', { name: contactName })}
          disabled={deleteContact.mutation.isPending}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={routes.contact(contact.id)}>
            <Pencil aria-hidden="true" />
            {t('openContact')}
          </Link>
        </DropdownMenuItem>
        <ConfirmDialog
          confirmLabel={t('delete')}
          description={t('deleteNamedContactDescription', { name: contactName })}
          isPending={deleteContact.mutation.isPending}
          onConfirm={handleDeleteContact}
          title={t('deleteContactDialogTitle')}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
