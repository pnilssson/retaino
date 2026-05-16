import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from '@tanstack/react-table';
import type { Contact } from '@retaino/shared/contracts';
import { DataTable } from '@/components/data-table';
import { Checkbox } from '@/components/ui/checkbox';
import { contactColumns } from './contact-columns';

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
  page,
  pageSize,
  rowSelection,
  selectable = false,
}: {
  contacts: Contact[];
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  page: number;
  pageSize: number;
  rowSelection?: RowSelectionState;
  selectable?: boolean;
}) {
  const rowNumberColumn = createRowNumberColumn(page, pageSize);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: selectable
      ? [selectionColumn, rowNumberColumn, ...contactColumns]
      : [rowNumberColumn, ...contactColumns],
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
      rowClassName="group odd:bg-muted/20 hover:bg-muted/40"
      table={table}
    />
  );
}

function createRowNumberColumn(
  page: number,
  pageSize: number,
): ColumnDef<Contact> {
  const firstRowNumber = (page - 1) * pageSize + 1;

  return {
    id: 'rowNumber',
    header: () => <span className="sr-only">Row number</span>,
    cell: ({ row }) => (
      <div className="flex w-10 items-center justify-end p-2 text-xs tabular-nums text-muted-foreground">
        {firstRowNumber + row.index}
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
    maxSize: 40,
    minSize: 40,
    size: 40,
  };
}
