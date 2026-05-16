"use client";

import { Ban, Trash2, X } from 'lucide-react';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useBulkDeleteContacts } from '@/features/contacts/hooks/use-bulk-delete-contacts';
import { useBulkSuppressContacts } from '@/features/contacts/hooks/use-bulk-suppress-contacts';

export function ContactBulkActions({
  contactIds,
  onClear,
  selectedCount,
}: {
  contactIds: string[];
  onClear: () => void;
  selectedCount: number;
}) {
  const bulkDelete = useBulkDeleteContacts();
  const bulkSuppress = useBulkSuppressContacts();
  const isPending =
    bulkDelete.mutation.isPending || bulkSuppress.mutation.isPending;
  const hasSelection = selectedCount > 0;

  async function suppressSelectedContacts() {
    if (!hasSelection) {
      return;
    }

    await bulkSuppress.mutation.mutateAsync({ contactIds, type: 'phone' });
    onClear();
  }

  async function deleteSelectedContacts() {
    if (!hasSelection) {
      return;
    }

    await bulkDelete.mutation.mutateAsync({ contactIds });
    onClear();
  }

  return (
    <div className="grid gap-3 py-1">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selectedCount} selected
        </p>
        {hasSelection ? (
          <div className="flex flex-wrap gap-2">
            <ConfirmDialog
              confirmLabel="Suppress SMS"
              description="This adds manual SMS suppressions for the selected contacts that have usable phone data."
              isPending={bulkSuppress.mutation.isPending}
              onConfirm={suppressSelectedContacts}
              title="Suppress selected contacts?"
              trigger={
                <Button
                  disabled={isPending}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Ban aria-hidden="true" data-icon="inline-start" />
                  Suppress SMS
                </Button>
              }
            />
            <ConfirmDialog
              confirmLabel="Delete contacts"
              description="This permanently deletes the selected contacts from this organization."
              isPending={bulkDelete.mutation.isPending}
              onConfirm={deleteSelectedContacts}
              title="Delete selected contacts?"
              trigger={
                <Button
                  disabled={isPending}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  <Trash2 aria-hidden="true" data-icon="inline-start" />
                  Delete
                </Button>
              }
              variant="destructive"
            />
            <Button
              disabled={isPending}
              onClick={onClear}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" data-icon="inline-start" />
              Clear
            </Button>
          </div>
        ) : null}
      </div>
      {bulkDelete.error || bulkSuppress.error ? (
        <ItemNotice
          description={bulkDelete.error ?? bulkSuppress.error}
          title="Bulk action failed"
          tone="destructive"
        />
      ) : null}
    </div>
  );
}
