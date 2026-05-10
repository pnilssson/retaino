import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Contact } from '@retaino/shared/contracts';
import { routes } from '@/lib/routes';
import { formatDate } from './contacts-format';
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
    accessorKey: 'lastService',
    header: 'Service',
    cell: ({ row }) => (
      <LinkedCell contact={row.original}>
        {row.original.lastService ?? 'Unknown'}
      </LinkedCell>
    ),
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => (
      <LinkedCell contact={row.original}>
        {row.original.source ?? 'Import'}
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
      <Link
        aria-label={`Open contact details for ${row.original.name ?? 'Unnamed contact'}`}
        className="flex justify-end p-2 text-muted-foreground transition-colors group-hover:text-foreground"
        href={routes.contact(row.original.id)}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
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
