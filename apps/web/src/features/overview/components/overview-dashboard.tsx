"use client";

import type {
  OverviewAttentionAction,
  OverviewResponse,
} from "@retaino/shared/contracts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  Megaphone,
  Send,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ItemNotice } from "@/components/item-notice";
import { SankeyBreakdown } from "@/components/sankey-breakdown";
import { Button } from "@/components/ui/button";
import { ContentSection } from "@/features/appshell/components/content-section";
import { routes } from "@/lib/routes";
import { textStyles } from "@/lib/text-styles";
import { cn } from "@/lib/utils";
import { attentionItemView } from "../overview-attention";
import { OverviewRecentCampaignsTable } from "./overview-recent-campaigns-table";
import { OverviewTrendChart } from "./overview-trend-chart";
import { OverviewWorkspaceStatus } from "./overview-workspace-status";

export function OverviewDashboard({
  overview,
}: {
  overview: OverviewResponse;
}) {
  const locale = useLocale();
  const campaignFlowWidth = Math.max(
    overview.funnel.selectedCount,
    overview.funnel.sentCount,
    overview.funnel.deliveredCount,
    overview.funnel.reportedBookingCount,
    1,
  );
  return (
    <div className="grid gap-5">
      {overview.attentionItems.length > 0 ? (
        <ContentSection title="Needs attention">
          <div className="divide-y">
            {overview.attentionItems.map((item) => (
              <AttentionItem
                item={item}
                key={item.id}
                locale={locale}
                overview={overview}
              />
            ))}
          </div>
        </ContentSection>
      ) : null}

      <OverviewWorkspaceStatus
        credits={overview.metrics.smsCreditBalance}
        sender={overview.sender}
      />

      <ContentSection contentClassName="gap-0 overflow-hidden p-0">
        {overview.metrics.reportedRevenueHasMixedCurrencies ? (
          <div className="px-6 pt-6">
            <ItemNotice
              description="Revenue totals are hidden when one dashboard window contains more than one currency."
              title="Mixed reported currencies"
              variant="warning"
            />
          </div>
        ) : null}
        <OverviewTrendChart
          currency={overview.metrics.reportedRevenueCurrency}
          hasMixedCurrencies={
            overview.metrics.reportedRevenueHasMixedCurrencies
          }
          trend={overview.trend}
        />
      </ContentSection>

      <ContentSection
        title="Campaign flow"
      >
        <SankeyBreakdown
          links={[
            { source: 0, target: 1, value: campaignFlowWidth },
            { source: 1, target: 2, value: campaignFlowWidth },
            {
              source: 2,
              target: 3,
              value: campaignFlowWidth,
            },
          ]}
          nodes={[
            {
              color: "var(--chart-1)",
              displayValue: overview.funnel.selectedCount,
              name: "Selected",
            },
            {
              color: "var(--chart-2)",
              displayValue: overview.funnel.sentCount,
              name: "Sent",
            },
            {
              color: "var(--chart-3)",
              displayValue: overview.funnel.deliveredCount,
              name: "Delivered",
            },
            {
              color: "var(--chart-5)",
              displayValue: overview.funnel.reportedBookingCount,
              name: "Booked",
            },
          ]}
          showHeader={false}
          showTooltip={false}
          summary={[
            {
              icon: Megaphone,
              iconClassName: "bg-slate-100 text-slate-700",
              label: "Selected",
              value: overview.funnel.selectedCount,
            },
            {
              icon: Send,
              iconClassName: "bg-sky-50 text-sky-700",
              label: "Sent",
              value: overview.funnel.sentCount,
            },
            {
              icon: Send,
              iconClassName: "bg-emerald-50 text-emerald-700",
              label: "Delivered",
              value: overview.funnel.deliveredCount,
            },
            {
              icon: CalendarCheck,
              iconClassName: "bg-emerald-50 text-emerald-700",
              label: "Booked",
              value: overview.funnel.reportedBookingCount,
            },
          ]}
          title="Campaign flow"
        />
      </ContentSection>

      <ContentSection
        framed={false}
        title="Recent campaigns"
      >
        {overview.recentCampaigns.length > 0 ? (
          <OverviewRecentCampaignsTable campaigns={overview.recentCampaigns} />
        ) : (
          <p className={textStyles.mutedBody}>
            Recent campaigns will appear after the first campaign is created.
          </p>
        )}
      </ContentSection>
    </div>
  );
}

function AttentionItem({
  item,
  locale,
  overview,
}: {
  item: OverviewResponse["attentionItems"][number];
  locale: string;
  overview: OverviewResponse;
}) {
  const view = attentionItemView(item, overview, locale);

  return (
    <div className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            item.tone === "critical"
              ? "text-rose-500"
              : item.tone === "warning"
                ? "text-amber-500"
                : "text-muted-foreground",
          )}
        />
        <div className="min-w-0">
          <p className={textStyles.itemTitle}>{view.title}</p>
          <p className={cn("mt-1", textStyles.mutedBody)}>
            {view.description}
          </p>
        </div>
      </div>
      <Button asChild className="shrink-0" size="sm" variant="outline">
        <Link href={attentionActionHref(item.action)}>
          {locale === "en" ? "Open" : "Öppna"}
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Link>
      </Button>
    </div>
  );
}

function attentionActionHref(action: OverviewAttentionAction) {
  if (action === "open_inbox") return routes.inbox;
  if (action === "open_billing") return routes.billing;
  if (action === "open_legal") return routes.legal;
  if (action === "open_campaign") return routes.campaigns;
  return routes.campaigns;
}
