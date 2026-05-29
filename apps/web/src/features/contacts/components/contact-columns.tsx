import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Contact } from '@retaino/shared/contracts';
import {
  SortableTableHeader,
  sortableHeaderAriaSort,
  type TableSortDirection,
} from '@/components/sortable-table-header';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { formatDate } from '../contacts-format';
import { ContactRowActions } from './contact-row-actions';
import { ContactStatusBadge } from './status-badge';

export type ContactSortKey =
  | 'createdAt'
  | 'lastBookingAt'
  | 'lastContactedAt'
  | 'name';

export function createContactColumns({
  direction,
  onSort,
  sort,
  tableActions,
}: {
  direction: TableSortDirection;
  onSort: (sort: ContactSortKey) => void;
  sort: ContactSortKey;
  tableActions?: ReactNode;
}): ColumnDef<Contact>[] {
  const sortableHeader = ({
    defaultDirection,
    label,
    sortKey,
  }: {
    defaultDirection: TableSortDirection;
    label: string;
    sortKey: ContactSortKey;
  }) => {
    const active = sort === sortKey;

    return {
      header: () => (
        <SortableTableHeader
          active={active}
          defaultDirection={defaultDirection}
          direction={direction}
          label={label}
          onSort={() => onSort(sortKey)}
        />
      ),
      meta: sortableHeaderAriaSort({ active, direction }),
    };
  };

  return [
    {
      accessorKey: 'name',
      ...sortableHeader({
        defaultDirection: 'asc',
        label: 'Name',
        sortKey: 'name',
      }),
      cell: ({ row }) => {
        const detailPath = routes.contact(row.original.id);

        return (
          <Link className="block p-2" href={detailPath}>
            <span className={textStyles.itemTitle}>
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
            <span className={textStyles.meta}>
              {row.original.email ?? 'No email'}
            </span>
          </div>
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'createdAt',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: 'Imported',
        sortKey: 'createdAt',
      }),
      cell: ({ row }) => (
        <LinkedCell contact={row.original}>
          {formatDate(row.original.createdAt)}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'lastBookingAt',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: 'Last booking',
        sortKey: 'lastBookingAt',
      }),
      cell: ({ row }) => (
        <LinkedCell contact={row.original}>
          {formatDate(row.original.lastBookingAt)}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'lastContactedAt',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: 'Last contacted',
        sortKey: 'lastContactedAt',
      }),
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
      header: () =>
        tableActions ? (
          <div className="flex justify-end pr-2">{tableActions}</div>
        ) : (
          <span className="sr-only">Open contact</span>
        ),
      cell: ({ row }) => (
        <div className="flex justify-end p-2">
          <ContactRowActions contact={row.original} />
        </div>
      ),
    },
  ];
}

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
