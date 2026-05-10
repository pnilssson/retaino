import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  CONTACT_IMPORT_ROW_STATUSES,
  type ContactImportRow,
  type ContactImportRowsResponse,
  type ContactImportSummary,
} from '@retaino/shared/contracts';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  formatImportRowIssue,
  formatImportRowStatus,
} from './contacts-format';
import { DataTable, EmptyState, PaginationControls } from './data-table';
import { ImportRowStatusBadge, ImportStatusBadge } from './status-badge';
import { cn } from '@/lib/utils';

const importRowColumns: ColumnDef<ContactImportRow>[] = [
  {
    accessorKey: 'rowNumber',
    header: 'CSV row',
  },
  {
    accessorKey: 'status',
    header: 'Result',
    cell: ({ row }) => <ImportRowStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'errors',
    header: 'Issues',
    cell: ({ row }) =>
      row.original.errors.map(formatImportRowIssue).join(', ') || 'None',
  },
];

export function ImportStatusPanel({
  latestImport,
  onPageChange,
  onStatusChange,
  rowStatus,
  rows,
}: {
  latestImport: ContactImportSummary | null;
  onPageChange: (page: number) => void;
  onStatusChange: (status: string) => void;
  rowStatus: string;
  rows: ContactImportRowsResponse | undefined;
}) {
  if (!latestImport) {
    return (
      <Item
        asChild
        className="grid items-stretch gap-5 border-border bg-card px-5 py-5"
      >
        <section>
          <ItemHeader className="items-start">
            <ItemContent className="gap-2">
              <ItemTitle className="text-base">Import status</ItemTitle>
            </ItemContent>
          </ItemHeader>
          <EmptyState
            description="Import results will appear after a CSV has been processed."
            title="No import activity yet"
          />
        </section>
      </Item>
    );
  }

  const progress =
    latestImport.totalRows > 0
      ? Math.round((latestImport.processedRows / latestImport.totalRows) * 100)
      : latestImport.status === 'completed'
        ? 100
        : 0;

  return (
    <Item
      asChild
      className="grid items-stretch gap-5 border-border bg-card px-5 py-5"
    >
      <section>
        <ItemHeader className="items-start">
          <ItemContent className="min-w-0 gap-2">
            <ItemTitle className="flex-wrap text-base">
              Import status
              <ImportStatusBadge status={latestImport.status} />
            </ItemTitle>
            <ItemDescription className="truncate">
              {latestImport.filename}
            </ItemDescription>
          </ItemContent>
        </ItemHeader>
        <Progress value={progress} />
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Metric
            label="Created"
            tone="green"
            value={latestImport.createdCount}
          />
          <Metric
            label="Updated"
            tone="blue"
            value={latestImport.updatedCount}
          />
          <Metric
            label="Invalid"
            tone="amber"
            value={latestImport.invalidCount}
          />
          <Metric
            label="Suppressed"
            tone={latestImport.suppressedCount > 0 ? 'amber' : 'gray'}
            value={latestImport.suppressedCount}
          />
        </dl>
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Row results</h3>
            <ItemActions>
              <Select
                onValueChange={(value) => onStatusChange(value)}
                value={rowStatus}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All row results</SelectItem>
                  {CONTACT_IMPORT_ROW_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatImportRowStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ItemActions>
          </div>
          {rows && rows.rows.length > 0 ? (
            <>
              <ImportRowsTable rows={rows.rows} />
              <PaginationControls
                itemLabel="rows"
                onPageChange={onPageChange}
                page={rows.page}
                pageSize={rows.pageSize}
                total={rows.total}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Row-level issues appear here after processing.
            </p>
          )}
        </div>
      </section>
    </Item>
  );
}

function ImportRowsTable({ rows }: { rows: ContactImportRow[] }) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: importRowColumns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return <DataTable table={table} />;
}

type MetricTone = 'amber' | 'blue' | 'gray' | 'green';

const metricToneClasses: Record<MetricTone, string> = {
  amber:
    'border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200',
  blue:
    'border-sky-200 bg-sky-50/70 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-200',
  gray:
    'border-slate-200 bg-slate-50/70 text-slate-800 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-200',
  green:
    'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200',
};

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: MetricTone;
  value: number;
}) {
  return (
    <div
      className={cn(
        'grid gap-1 rounded-md border px-3 py-2',
        metricToneClasses[tone],
      )}
    >
      <dt className="text-xs text-current/70">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
