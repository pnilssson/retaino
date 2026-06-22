import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
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
  labels,
  locale,
  onSort,
  sort,
  tableActions,
}: {
  direction: TableSortDirection;
  labels: {
    email: string;
    imported: string;
    lastBooking: string;
    lastContacted: string;
    name: string;
    noEmail: string;
    noPhone: string;
    notSet: string;
    openContact: string;
    openContactDetails: string;
    phone: string;
    sortAscending: (label: string) => string;
    sortDescending: (label: string) => string;
    status: string;
    unnamed: string;
  };
  locale: string;
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
    const nextDirection: TableSortDirection =
      active ? (direction === 'asc' ? 'desc' : 'asc') : defaultDirection;

    return {
      header: () => (
        <SortableTableHeader
          active={active}
          defaultDirection={defaultDirection}
          direction={direction}
          label={label}
          onSort={() => onSort(sortKey)}
          sortLabel={
            nextDirection === 'asc'
              ? labels.sortAscending(label)
              : labels.sortDescending(label)
          }
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
        label: labels.name,
        sortKey: 'name',
      }),
      cell: ({ row }) => {
        const detailPath = routes.contact(row.original.id);

        return (
          <Link className="block p-2" href={detailPath}>
            <span className={textStyles.h3}>
              {row.original.name ?? labels.unnamed}
            </span>
            <span className="sr-only">{labels.openContactDetails}</span>
          </Link>
        );
      },
    },
    {
      id: 'phone',
      header: labels.phone,
      cell: ({ row }) => (
        <LinkedCell contact={row.original}>
          <div className="min-w-36">
            <span>{row.original.phone ?? labels.noPhone}</span>
          </div>
        </LinkedCell>
      ),
    },
    {
      id: 'email',
      header: labels.email,
      cell: ({ row }) => (
        <LinkedCell contact={row.original}>
          {row.original.email ?? labels.noEmail}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'createdAt',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: labels.imported,
        sortKey: 'createdAt',
      }),
      cell: ({ row }) => (
        <LinkedCell contact={row.original}>
          {formatDate(row.original.createdAt, locale, labels.notSet)}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'lastBookingAt',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: labels.lastBooking,
        sortKey: 'lastBookingAt',
      }),
      cell: ({ row }) => (
        <LinkedCell contact={row.original}>
          {formatDate(row.original.lastBookingAt, locale, labels.notSet)}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'lastContactedAt',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: labels.lastContacted,
        sortKey: 'lastContactedAt',
      }),
      cell: ({ row }) => (
        <LinkedCell contact={row.original}>
          {formatDate(row.original.lastContactedAt, locale, labels.notSet)}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'contactStatus',
      header: labels.status,
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
          <span className="sr-only">{labels.openContact}</span>
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
