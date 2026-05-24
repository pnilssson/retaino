"use client";

import { Ban, MoreVertical, Trash2 } from 'lucide-react';
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
      toast.error('Contacts could not be suppressed', {
        description:
          error instanceof Error ? error.message : 'Try again in a moment.',
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
      toast.error('Contacts could not be deleted', {
        description:
          error instanceof Error ? error.message : 'Try again in a moment.',
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open contact actions"
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
          confirmLabel="Suppress SMS"
          description="This adds manual SMS suppressions for the selected contacts that have usable phone data."
          isPending={bulkSuppress.mutation.isPending}
          onConfirm={suppressSelectedContacts}
          title="Suppress selected contacts?"
          trigger={
            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
              <Ban aria-hidden="true" />
              Suppress SMS
            </DropdownMenuItem>
          }
        />
        <ConfirmDialog
          confirmLabel="Delete contacts"
          description="This permanently deletes the selected contacts from this organization."
          isPending={bulkDelete.mutation.isPending}
          onConfirm={deleteSelectedContacts}
          title="Delete selected contacts?"
          trigger={
            <DropdownMenuItem
              onSelect={(event) => event.preventDefault()}
              variant="destructive"
            >
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          }
          variant="destructive"
        />
        <DropdownMenuLabel>{selectedCount} selected</DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
