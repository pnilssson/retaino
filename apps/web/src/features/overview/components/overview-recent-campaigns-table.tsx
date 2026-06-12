"use client";

import type {
  CampaignStatus,
  OverviewCampaignNextAction,
  OverviewResponse,
} from "@retaino/shared/contracts";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowRight,
  Pencil,
} from "lucide-react";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge, type StatusBadgeTone } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { textStyles } from "@/lib/text-styles";
import { cn } from "@/lib/utils";
import {
  formatOverviewCurrency,
  formatOverviewNumber,
} from "../overview-format";

type OverviewRecentCampaign = OverviewResponse["recentCampaigns"][number];

export function OverviewRecentCampaignsTable({
  campaigns,
}: {
  campaigns: OverviewRecentCampaign[];
}) {
  const locale = useLocale();
  const t = useTranslations('Overview');

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: createRecentCampaignColumns(locale, createRecentCampaignLabels(t)),
    data: campaigns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <DataTable
      cellClassName="p-0"
      rowClassName="group"
      table={table}
    />
  );
}

function createRecentCampaignColumns(
  locale: string,
  labels: RecentCampaignLabels,
): ColumnDef<OverviewRecentCampaign>[] {
  return [
  {
    accessorKey: "name",
    header: labels.campaign,
    cell: ({ row }) => (
      <Link className="block min-w-44 p-2" href={routes.campaign(row.original.id)}>
        <span className={cn("block break-words", textStyles.itemTitle)}>
          {row.original.name}
        </span>
      </Link>
    ),
  },
  {
    id: "delivered",
    header: labels.delivered,
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        {formatOverviewNumber(row.original.deliveredCount, locale)}
      </LinkedCell>
    ),
  },
  {
    id: "replies",
    header: labels.replies,
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        {formatOverviewNumber(row.original.inboundReplyCount, locale)}
      </LinkedCell>
    ),
  },
  {
    id: "optOuts",
    header: labels.optOuts,
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        {formatOverviewNumber(row.original.optOutCount, locale)}
      </LinkedCell>
    ),
  },
  {
    id: "bookings",
    header: labels.bookings,
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        {formatOverviewNumber(row.original.reportedBookingCount, locale)}
      </LinkedCell>
    ),
  },
  {
    id: "revenue",
    header: labels.revenue,
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        {row.original.reportedRevenueHasMixedCurrencies
          ? labels.mixed
            : formatOverviewCurrency(
                row.original.reportedRevenueAmountMinor,
                row.original.reportedRevenueCurrency,
                locale,
              )}
      </LinkedCell>
    ),
  },
  {
    accessorKey: "status",
    header: labels.status,
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        <StatusBadge
          label={labels.statusLabel(row.original.status)}
          tone={campaignStatusTone(row.original.status)}
        />
      </LinkedCell>
    ),
  },
  {
    id: "open",
    header: () => <span className="sr-only">{labels.campaignActions}</span>,
    cell: ({ row }) => (
      <div className="flex justify-end p-2">
        <Button
          aria-label={labels.campaignAction(row.original.nextAction, row.original.name)}
          asChild
          size="icon-sm"
          variant="ghost"
        >
          <Link href={routes.campaign(row.original.id)}>
            <CampaignActionIcon
              action={row.original.nextAction}
              aria-hidden="true"
            />
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
  campaign: OverviewRecentCampaign;
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

type RecentCampaignLabels = ReturnType<typeof createRecentCampaignLabels>;

function createRecentCampaignLabels(t: ReturnType<typeof useTranslations<'Overview'>>) {
  return {
    bookings: t('bookings'),
    campaign: t('campaign'),
    campaignActions: t('campaignActions'),
    delivered: t('delivered'),
    mixed: t('mixed'),
    optOuts: t('optOuts'),
    replies: t('replies'),
    revenue: t('revenue'),
    status: t('status'),
    campaignAction: (action: OverviewCampaignNextAction, name: string) =>
      t('campaignActionLabel', {
        action: campaignActionLabel(action, t),
        name,
      }),
    statusLabel: (status: CampaignStatus) => campaignStatusLabel(status, t),
  };
}

function campaignActionLabel(
  action: OverviewCampaignNextAction,
  t: ReturnType<typeof useTranslations<'Overview'>>,
) {
  if (action === "continue_setup") return t('actionContinue');
  if (action === "monitor_send") return t('actionMonitor');
  if (action === "report_bookings") return t('actionReport');
  if (action === "fix_campaign") return t('actionReview');
  return t('open');
}

function CampaignActionIcon({
  action,
  ...props
}: React.ComponentProps<typeof Pencil> & {
  action: OverviewCampaignNextAction;
}) {
  const Icon =
    action === "continue_setup" || action === "monitor_send"
      ? ArrowRight
      : Pencil;

  return <Icon {...props} />;
}

function campaignStatusLabel(
  status: CampaignStatus,
  t: ReturnType<typeof useTranslations<'Overview'>>,
) {
  if (status === "ready_to_send") return t('statusReady');
  if (status === "sending") return t('statusSending');
  if (status === "sent") return t('statusSent');
  if (status === "failed") return t('statusFailed');
  return t('statusDraft');
}

function campaignStatusTone(status: CampaignStatus): StatusBadgeTone {
  if (status === "sent") return "green";
  if (status === "sending" || status === "ready_to_send") return "blue";
  if (status === "failed") return "red";
  return "gray";
}
