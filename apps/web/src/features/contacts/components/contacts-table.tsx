import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from '@tanstack/react-table';
import { useLocale } from 'next-intl';
import type { ReactNode } from 'react';
import type { Contact } from '@retaino/shared/contracts';
import { DataTable } from '@/components/data-table';
import type { TableSortDirection } from '@/components/sortable-table-header';
import { Checkbox } from '@/components/ui/checkbox';
import {
  createContactColumns,
  type ContactSortKey,
} from './contact-columns';

const selectionColumn: ColumnDef<Contact> = {
  id: 'select',
  header: ({ table }) => (
    <div className="-mx-2 flex h-10 w-12 items-center justify-center">
      <Checkbox
        aria-label="Select all visible contacts"
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
        aria-label={`Select ${row.original.name ?? 'contact'}`}
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

export function ContactsTable({
  contacts,
  direction,
  isLoading = false,
  loadingLabel = 'Loading contacts',
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
  const contactColumns = createContactColumns({
    direction,
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
      loadingLabel={loadingLabel}
      rowClassName="group"
      table={table}
    />
  );
}
