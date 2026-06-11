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
import { useLocale } from "next-intl";
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: createRecentCampaignColumns(locale),
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
): ColumnDef<OverviewRecentCampaign>[] {
  return [
  {
    accessorKey: "name",
    header: "Campaign",
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
    header: "Delivered",
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        {formatOverviewNumber(row.original.deliveredCount, locale)}
      </LinkedCell>
    ),
  },
  {
    id: "replies",
    header: "Replies",
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        {formatOverviewNumber(row.original.inboundReplyCount, locale)}
      </LinkedCell>
    ),
  },
  {
    id: "optOuts",
    header: "Opt-outs",
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        {formatOverviewNumber(row.original.optOutCount, locale)}
      </LinkedCell>
    ),
  },
  {
    id: "bookings",
    header: "Bookings",
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        {formatOverviewNumber(row.original.reportedBookingCount, locale)}
      </LinkedCell>
    ),
  },
  {
    id: "revenue",
    header: "Revenue",
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        {row.original.reportedRevenueHasMixedCurrencies
          ? "Mixed"
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
    header: "Status",
    cell: ({ row }) => (
      <LinkedCell campaign={row.original}>
        <StatusBadge
          label={campaignStatusLabel(row.original.status)}
          tone={campaignStatusTone(row.original.status)}
        />
      </LinkedCell>
    ),
  },
  {
    id: "open",
    header: () => <span className="sr-only">Campaign actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end p-2">
        <Button
          aria-label={`${campaignActionLabel(row.original.nextAction)} ${row.original.name}`}
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

function campaignActionLabel(action: OverviewCampaignNextAction) {
  if (action === "continue_setup") return "Continue";
  if (action === "monitor_send") return "Monitor";
  if (action === "report_bookings") return "Report";
  if (action === "fix_campaign") return "Review";
  return "Open";
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

function campaignStatusLabel(status: CampaignStatus) {
  if (status === "ready_to_send") return "Ready";
  if (status === "sending") return "Sending";
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  return "Draft";
}

function campaignStatusTone(status: CampaignStatus): StatusBadgeTone {
  if (status === "sent") return "green";
  if (status === "sending" || status === "ready_to_send") return "blue";
  if (status === "failed") return "red";
  return "gray";
}
