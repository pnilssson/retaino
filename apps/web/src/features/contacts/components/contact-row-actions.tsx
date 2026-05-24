"use client";

import type { Contact } from '@retaino/shared/contracts';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
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
  const deleteContact = useDeleteContact(contact.organizationId, contact.id, {
    redirectOnSuccess: false,
  });
  const contactName = contact.name ?? 'Unnamed contact';

  async function handleDeleteContact() {
    try {
      await deleteContact.mutation.mutateAsync();
      toast.success('Contact deleted');
    } catch (error) {
      toast.error('Contact could not be deleted', {
        description:
          error instanceof Error ? error.message : 'Try again in a moment.',
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for ${contactName}`}
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
            Open contact
          </Link>
        </DropdownMenuItem>
        <ConfirmDialog
          confirmLabel="Delete contact"
          description={`This permanently deletes ${contactName} from this organization.`}
          isPending={deleteContact.mutation.isPending}
          onConfirm={handleDeleteContact}
          title="Delete contact?"
          trigger={
            <DropdownMenuItem
              onSelect={(event) => event.preventDefault()}
              variant="destructive"
            >
              <Trash2 aria-hidden="true" />
              Delete contact
            </DropdownMenuItem>
          }
          variant="destructive"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
