import { type Table as TanStackTable, flexRender } from '@tanstack/react-table';
import { LoadingState } from '@/components/loading-state';
import type { SortableTableHeaderMeta } from '@/components/sortable-table-header';
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
export { EmptyState } from '@/components/empty-state';

export function DataTable<TData>({
  cellClassName,
  isLoading = false,
  loadingLabel = 'Loading',
  rowClassName,
  table,
}: {
  cellClassName?: string;
  isLoading?: boolean;
  loadingLabel?: string;
  rowClassName?: string;
  table: TanStackTable<TData>;
}) {
  const rows = table.getRowModel().rows;
  const visibleColumnCount = table.getVisibleLeafColumns().length;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-muted/60">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              className="border-border hover:bg-transparent"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  aria-sort={
                    (header.column.columnDef.meta as SortableTableHeaderMeta | undefined)
                      ?.ariaSort
                  }
                  key={header.id}
                >
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
          {isLoading && rows.length === 0 ? (
            <TableRow className="border-border hover:bg-transparent">
              <TableCell className="h-24" colSpan={visibleColumnCount}>
                <LoadingState
                  className="justify-center"
                  label={loadingLabel}
                />
              </TableCell>
            </TableRow>
          ) : (
            <>
              {isLoading ? (
                <TableRow className="border-border bg-background hover:bg-background">
                  <TableCell className="h-12" colSpan={visibleColumnCount}>
                    <LoadingState
                      className="justify-center"
                      label={loadingLabel}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
              {rows.map((row) => (
                <TableRow
                  className={cn('border-border hover:bg-muted/40', rowClassName)}
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell className={cellClassName} key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </>
          )}
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
                className={
                  !hasPreviousPage ? 'pointer-events-none opacity-50' : undefined
                }
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
                className={
                  !hasNextPage ? 'pointer-events-none opacity-50' : undefined
                }
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
