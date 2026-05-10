import {
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { Contact } from '@retaino/shared/contracts';
import { contactColumns } from './contact-columns';
import { DataTable } from './data-table';

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: contactColumns,
    data: contacts,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <DataTable
      cellClassName="p-0"
      rowClassName="group hover:bg-muted/40"
      table={table}
    />
  );
}
