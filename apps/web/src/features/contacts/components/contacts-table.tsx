import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
import type { ReactNode } from 'react';
import type { Contact } from '@retaino/shared/contracts';
import { DataTable } from '@/components/data-table';
import type { TableSortDirection } from '@/components/sortable-table-header';
import { Checkbox } from '@/components/ui/checkbox';
import {
  createContactColumns,
  type ContactSortKey,
} from './contact-columns';

function createSelectionColumn(labels: {
  contact: string;
  selectAllVisible: string;
  selectContact: (name: string) => string;
}): ColumnDef<Contact> {
  return {
    id: 'select',
    header: ({ table }) => (
      <div className="-mx-2 flex h-10 w-12 items-center justify-center">
        <Checkbox
          aria-label={labels.selectAllVisible}
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex w-12 items-center justify-center py-3">
        <Checkbox
          aria-label={labels.selectContact(row.original.name ?? labels.contact)}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
    maxSize: 48,
    minSize: 48,
    size: 48,
  };
}

export function ContactsTable({
  contacts,
  direction,
  isLoading = false,
  loadingLabel,
  onRowSelectionChange,
  onSort,
  rowSelection,
  selectable = false,
  sort,
  tableActions,
}: {
  contacts: Contact[];
  direction: TableSortDirection;
  isLoading?: boolean;
  loadingLabel?: string;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  onSort: (sort: ContactSortKey) => void;
  rowSelection?: RowSelectionState;
  selectable?: boolean;
  sort: ContactSortKey;
  tableActions?: ReactNode;
}) {
  const locale = useLocale();
  const t = useTranslations('Contacts');
  const selectionColumn = createSelectionColumn({
    contact: t('contact'),
    selectAllVisible: t('selectAllVisibleContacts'),
    selectContact: (name) => t('selectContact', { name }),
  });
  const contactColumns = createContactColumns({
    direction,
    labels: {
      email: t('email'),
      imported: t('imported'),
      lastBooking: t('lastBooking'),
      lastContacted: t('lastContacted'),
      name: t('name'),
      noEmail: t('noEmail'),
      noPhone: t('noPhone'),
      notSet: t('notSet'),
      openContact: t('openContact'),
      openContactDetails: t('openContactDetails'),
      phone: t('phone'),
      sortAscending: (label) => t('sortAscending', { label }),
      sortDescending: (label) => t('sortDescending', { label }),
      status: t('status'),
      unnamed: t('unnamed'),
    },
    locale,
    onSort,
    sort,
    tableActions,
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: selectable
      ? [selectionColumn, ...contactColumns]
      : contactColumns,
    data: contacts,
    enableRowSelection: selectable,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    onRowSelectionChange,
    state: selectable ? { rowSelection: rowSelection ?? {} } : undefined,
  });

  return (
    <DataTable
      cellClassName="p-0"
      isLoading={isLoading}
      loadingLabel={loadingLabel ?? t('loadingContacts')}
      rowClassName="group"
      table={table}
    />
  );
}
