"use client";

import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import type { Campaign } from '@retaino/shared/contracts';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { DataTable } from '@/components/data-table';
import {
  SortableTableHeader,
  sortableHeaderAriaSort,
  type TableSortDirection,
} from '@/components/sortable-table-header';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';
import type { CampaignListSort } from '../campaign-list-state';
import { CampaignStatusBadge } from './campaign-status-badge';

export function CampaignsTable({
  campaigns,
  direction,
  isLoading = false,
  loadingLabel = 'Loading campaigns',
  onSort,
  sort,
}: {
  campaigns: Campaign[];
  direction: TableSortDirection;
  isLoading?: boolean;
  loadingLabel?: string;
  onSort: (sort: CampaignListSort) => void;
  sort: CampaignListSort;
}) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: createCampaignColumns({ direction, onSort, sort }),
    data: campaigns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
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
  sort,
}: {
  direction: TableSortDirection;
  onSort: (sort: CampaignListSort) => void;
  sort: CampaignListSort;
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
          <Link className="block min-w-56 p-2" href={detailPath}>
            <span className="block break-words font-medium">
              {row.original.name}
            </span>
            <span className="mt-1 block break-words text-xs text-muted-foreground">
              {row.original.campaignCode ?? 'No campaign reference'}
            </span>
          </Link>
        );
      },
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
      header: () => <span className="sr-only">Open campaign</span>,
      cell: ({ row }) => (
        <div className="flex justify-end p-2">
          <Button asChild size="icon-sm" variant="ghost">
            <Link
              aria-label={`Open campaign ${row.original.name}`}
              href={routes.campaign(row.original.id)}
            >
              <Pencil aria-hidden="true" />
            </Link>
          </Button>
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
