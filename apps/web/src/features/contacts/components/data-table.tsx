import type { ReactNode } from 'react';
import { type Table as TanStackTable, flexRender } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export function DataTable<TData>({
  cellClassName,
  rowClassName,
  table,
}: {
  cellClassName?: string;
  rowClassName?: string;
  table: TanStackTable<TData>;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="[&_tr]:border-0">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              className="border-0 hover:bg-transparent"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              className={cn('border-0 hover:bg-transparent', rowClassName)}
              key={row.id}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell className={cellClassName} key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PaginationControls({
  itemLabel = 'items',
  onPageChange,
  page,
  pageSize,
  total,
}: {
  itemLabel?: string;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = paginationPages(page, totalPages);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const summary =
    totalPages <= 1
      ? `${total} ${itemLabel}`
      : `Showing ${start}-${end} of ${total} ${itemLabel}`;
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{summary}</span>
      {totalPages > 1 ? (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={!hasPreviousPage}
                className={!hasPreviousPage ? 'pointer-events-none opacity-50' : undefined}
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (hasPreviousPage) {
                    onPageChange(page - 1);
                  }
                }}
                tabIndex={hasPreviousPage ? undefined : -1}
              />
            </PaginationItem>
            {pages.map((item, index) =>
              item === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    isActive={item === page}
                    onClick={() => onPageChange(item)}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                aria-disabled={!hasNextPage}
                className={!hasNextPage ? 'pointer-events-none opacity-50' : undefined}
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (hasNextPage) {
                    onPageChange(page + 1);
                  }
                }}
                tabIndex={hasNextPage ? undefined : -1}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}

function paginationPages(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);

  return Array.from(pages)
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b)
    .flatMap((item, index, items): Array<number | 'ellipsis'> => {
      const previous = items[index - 1];

      if (previous && item - previous > 1) {
        return ['ellipsis', item];
      }

      return [item];
    });
}

export function EmptyState({
  action,
  description = 'No rows to show.',
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="py-6">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function TableLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {label}
    </div>
  );
}
