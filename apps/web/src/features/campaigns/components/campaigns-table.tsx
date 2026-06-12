"use client";

import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from '@tanstack/react-table';
import type { Campaign } from '@retaino/shared/contracts';
import { Link } from '@/i18n/navigation';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
import type { ReactNode } from 'react';
import { DataTable } from '@/components/data-table';
import {
  SortableTableHeader,
  sortableHeaderAriaSort,
  type TableSortDirection,
} from '@/components/sortable-table-header';
import { Checkbox } from '@/components/ui/checkbox';
import { getIntlLocale } from '@/lib/locale-format';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import type { CampaignListSort } from '../campaign-list-state';
import { CampaignRowActions } from './campaign-row-actions';
import { CampaignStatusBadge } from './campaign-status-badge';

function createSelectionColumn(labels: {
  selectAllVisibleCampaigns: string;
  selectCampaign: (name: string) => string;
}): ColumnDef<Campaign> {
  return {
  id: 'select',
  header: ({ table }) => (
    <div className="-mx-2 flex h-10 w-12 items-center justify-center">
      <Checkbox
        aria-label={labels.selectAllVisibleCampaigns}
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
        aria-label={labels.selectCampaign(row.original.name)}
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

export function CampaignsTable({
  campaigns,
  direction,
  isLoading = false,
  loadingLabel,
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
  const locale = useLocale();
  const t = useTranslations('Campaigns');
  const selectionColumn = createSelectionColumn({
    selectAllVisibleCampaigns: t('selectAllVisibleCampaigns'),
    selectCampaign: (name) => t('selectCampaign', { name }),
  });
  const campaignColumns = createCampaignColumns({
    direction,
    labels: {
      audience: t('audience'),
      campaign: t('campaign'),
      campaignActions: t('campaignActions'),
      created: t('created'),
      daysElapsed: (days) => t('daysElapsed', { days }),
      lastUpdated: t('lastUpdated'),
      noReference: t('noReference'),
      reference: t('reference'),
      status: t('status'),
    },
    onSort,
    organizationId: organizationId ?? null,
    locale,
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
      loadingLabel={loadingLabel ?? t('loadingCampaigns')}
      rowClassName="group"
      table={table}
    />
  );
}

function createCampaignColumns({
  direction,
  labels,
  locale,
  onSort,
  organizationId,
  sort,
  tableActions,
}: {
  direction: TableSortDirection;
  labels: {
    audience: string;
    campaign: string;
    campaignActions: string;
    created: string;
    daysElapsed: (days: number) => string;
    lastUpdated: string;
    noReference: string;
    reference: string;
    status: string;
  };
  locale: string;
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
        label: labels.campaign,
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
      header: labels.reference,
      cell: ({ row }) => (
        <LinkedCell campaign={row.original}>
          {row.original.campaignCode ?? labels.noReference}
        </LinkedCell>
      ),
    },
    {
      id: 'audience',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: labels.audience,
        sortKey: 'lapsedDays',
      }),
      cell: ({ row }) => (
        <LinkedCell campaign={row.original}>
          {labels.daysElapsed(row.original.audienceRule.lapsedDays)}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'createdAt',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: labels.created,
        sortKey: 'createdAt',
      }),
      cell: ({ row }) => (
        <LinkedCell campaign={row.original}>
          {formatCampaignDate(row.original.createdAt, locale)}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'updatedAt',
      ...sortableHeader({
        defaultDirection: 'desc',
        label: labels.lastUpdated,
        sortKey: 'updatedAt',
      }),
      cell: ({ row }) => (
        <LinkedCell campaign={row.original}>
          {formatCampaignDate(row.original.updatedAt, locale)}
        </LinkedCell>
      ),
    },
    {
      accessorKey: 'status',
      ...sortableHeader({
        defaultDirection: 'asc',
        label: labels.status,
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
          <span className="sr-only">{labels.campaignActions}</span>
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

function formatCampaignDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
  }).format(new Date(value));
}
