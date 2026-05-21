import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import type { Contact } from '@retaino/shared/contracts';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';
import { formatDate } from '../contacts-format';
import { ContactStatusBadge } from './status-badge';

export const contactColumns: ColumnDef<Contact>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const detailPath = routes.contact(row.original.id);

      return (
        <Link className="block p-2" href={detailPath}>
          <span className="font-medium underline-offset-4 group-hover:underline">
            {row.original.name ?? 'Unnamed'}
          </span>
          <span className="sr-only">Open contact details</span>
        </Link>
      );
    },
  },
  {
    id: 'contact',
    header: 'Phone and email',
    cell: ({ row }) => (
      <LinkedCell contact={row.original}>
        <div className="grid min-w-44 gap-1">
          <span>{row.original.phone ?? 'No phone'}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.email ?? 'No email'}
          </span>
        </div>
      </LinkedCell>
    ),
  },
  {
    accessorKey: 'lastBookingAt',
    header: 'Last booking',
    cell: ({ row }) => (
      <LinkedCell contact={row.original}>
        {formatDate(row.original.lastBookingAt)}
      </LinkedCell>
    ),
  },
  {
    accessorKey: 'lastContactedAt',
    header: 'Last contacted',
    cell: ({ row }) => (
      <LinkedCell contact={row.original}>
        {formatDate(row.original.lastContactedAt)}
      </LinkedCell>
    ),
  },
  {
    accessorKey: 'contactStatus',
    header: 'Status',
    cell: ({ row }) => (
      <LinkedCell contact={row.original}>
        <ContactStatusBadge status={row.original.contactStatus} />
      </LinkedCell>
    ),
  },
  {
    id: 'open',
    header: () => <span className="sr-only">Open contact</span>,
    cell: ({ row }) => (
      <div className="flex justify-end p-2">
        <Button asChild size="icon-sm" variant="ghost">
          <Link
            aria-label={`Open contact details for ${
              row.original.name ?? 'Unnamed contact'
            }`}
            href={routes.contact(row.original.id)}
          >
            <Pencil aria-hidden="true" />
          </Link>
        </Button>
      </div>
    ),
  },
];

function LinkedCell({
  children,
  contact,
}: {
  children: ReactNode;
  contact: Contact;
}) {
  return (
    <Link className="block p-2" href={routes.contact(contact.id)} tabIndex={-1}>
      {children}
    </Link>
  );
}
