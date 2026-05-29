"use client";

import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from '@tanstack/react-table';
import type { Campaign } from '@retaino/shared/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { DataTable } from '@/components/data-table';
import {
  SortableTableHeader,
  sortableHeaderAriaSort,
  type TableSortDirection,
} from '@/components/sortable-table-header';
import { Checkbox } from '@/components/ui/checkbox';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import type { CampaignListSort } from '../campaign-list-state';
import { CampaignRowActions } from './campaign-row-actions';
import { CampaignStatusBadge } from './campaign-status-badge';

const selectionColumn: ColumnDef<Campaign> = {
  id: 'select',
  header: ({ table }) => (
    <div className="-mx-2 flex h-10 w-12 items-center justify-center">
      <Checkbox
        aria-label="Select all visible campaigns"
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
        aria-label={`Select ${row.original.name}`}
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

export function CampaignsTable({
  campaigns,
  direction,
  isLoading = false,
  loadingLabel = 'Loading campaigns',
  onRowSelectionChange,
  onSort,
  organizationId,
  rowSelection,
  selectable = false,
  sort,
  tableActions,
}: {
  campaigns: Campaign[];
  direction: TableSortDirection;
  isLoading?: boolean;
  loadingLabel?: string;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  onSort: (sort: CampaignListSort) => void;
  organizationId?: string | null;
  rowSelection?: RowSelectionState;
  selectable?: boolean;
  sort: CampaignListSort;
  tableActions?: ReactNode;
}) {
  const campaignColumns = createCampaignColumns({
    direction,
    onSort,
    organizationId: organizationId ?? null,
    sort,
    tableActions,
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: selectable
      ? [selectionColumn, ...campaignColumns]
      : campaignColumns,
    data: campaigns,
    enableRowSelection: selectable,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
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

function createCampaignColumns({
  direction,
  onSort,
  organizationId,
  sort,
  tableActions,
}: {
  direction: TableSortDirection;
  onSort: (sort: CampaignListSort) => void;
  organizationId: string | null;
  sort: CampaignListSort;
  tableActions?: ReactNode;
}): ColumnDef<Campaign>[] {
  const sortableHeader = ({
    defaultDirection,
    label,
    sortKey,
  }: {
    defaultDirection: TableSortDirection;
    label: string;
    sortKey: CampaignListSort;
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
        label: 'Campaign',
        sortKey: 'name',
      }),
      cell: ({ row }) => {
        const detailPath = routes.campaign(row.original.id);

        return (
          <Link className="block min-w-44 p-2" href={detailPath}>
            <span className={cn('block break-words', textStyles.itemTitle)}>
              {row.original.name}
            </span>
          </Link>
        );
      },
    },
    {
      id: 'reference',
      header: 'Reference',
      cell: ({ row }) => (
        <LinkedCell campaign={row.original}>
          {row.original.campaignCode ?? 'No reference'}
        </LinkedCell>
      ),
    },
    {
      id: 'audience',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: 'Audience',
        sortKey: 'lapsedDays',
      }),
      cell: ({ row }) => (
        <LinkedCell campaign={row.original}>
          {row.original.audienceRule.lapsedDays} days elapsed
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'createdAt',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: 'Created',
        sortKey: 'createdAt',
      }),
      cell: ({ row }) => (
        <LinkedCell campaign={row.original}>
          {formatCampaignDate(row.original.createdAt)}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'updatedAt',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: 'Last updated',
        sortKey: 'updatedAt',
      }),
      cell: ({ row }) => (
        <LinkedCell campaign={row.original}>
          {formatCampaignDate(row.original.updatedAt)}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'status',
      ...sortableHeader({
        defaultDirection: 'asc',
        label: 'Status',
        sortKey: 'status',
      }),
      cell: ({ row }) => (
        <LinkedCell campaign={row.original}>
          <CampaignStatusBadge status={row.original.status} />
        </LinkedCell>
      ),
    },
    {
      id: 'open',
      header: () =>
        tableActions ? (
          <div className="flex justify-end pr-2">{tableActions}</div>
        ) : (
          <span className="sr-only">Campaign actions</span>
        ),
      cell: ({ row }) => (
        <div className="flex justify-end p-2">
          <CampaignRowActions
            campaign={row.original}
            organizationId={organizationId}
          />
        </div>
      ),
    },
  ];
}

function LinkedCell({
  campaign,
  children,
}: {
  campaign: Campaign;
  children: ReactNode;
}) {
  return (
    <Link
      className="block min-w-0 p-2"
      href={routes.campaign(campaign.id)}
      tabIndex={-1}
    >
      {children}
    </Link>
  );
}

function formatCampaignDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
}
