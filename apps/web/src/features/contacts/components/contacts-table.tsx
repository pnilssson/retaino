import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from '@tanstack/react-table';
import type { Contact } from '@retaino/shared/contracts';
import { Checkbox } from '@/components/ui/checkbox';
import { contactColumns } from './contact-columns';
import { DataTable } from './data-table';

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
  onRowSelectionChange,
  rowSelection,
  selectable = false,
}: {
  contacts: Contact[];
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  rowSelection?: RowSelectionState;
  selectable?: boolean;
}) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: selectable ? [selectionColumn, ...contactColumns] : contactColumns,
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
      rowClassName="group hover:bg-muted/40"
      table={table}
    />
  );
}
