"use client";

import type {
  OverviewAttentionAction,
  OverviewResponse,
} from "@retaino/shared/contracts";
import {
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import {
  useTranslations,
} from "next-intl";
import { Link } from "@/i18n/navigation";
import { FunnelBreakdown } from "@/components/funnel-breakdown";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ContentSection } from "@/features/appshell/components/content-section";
import { routes } from "@/lib/routes";
import { textStyles } from "@/lib/text-styles";
import { cn } from "@/lib/utils";
import {
  attentionItemView,
  type OverviewAttentionLabels,
} from "../overview-attention";
import { OverviewRecentCampaignsTable } from "./overview-recent-campaigns-table";
import { OverviewResultsGauges } from "./overview-results-gauges";
import { OverviewWorkspaceStatus } from "./overview-workspace-status";

export function OverviewDashboard({
  overview,
}: {
  overview: OverviewResponse;
}) {
  const t = useTranslations('Overview');
  return (
    <div className="grid gap-5">
      {overview.attentionItems.length > 0 ? (
        <ContentSection framed={false} title={t('needsAttention')}>
          <ItemGroup>
            {overview.attentionItems.map((item) => (
              <AttentionItem
                item={item}
                key={item.id}
                labels={createAttentionLabels(t)}
                overview={overview}
              />
            ))}
          </ItemGroup>
        </ContentSection>
      ) : null}

      <OverviewWorkspaceStatus
        credits={overview.metrics.smsCreditBalance}
        sender={overview.sender}
      />

      <OverviewResultsGauges overview={overview} />

      <ContentSection
        title={t('campaignFlow')}
      >
        <FunnelBreakdown
          stages={[
            {
              label: t('flowSelected'),
              value: overview.funnel.selectedCount,
            },
            {
              label: t('flowSent'),
              value: overview.funnel.sentCount,
            },
            {
              label: t('flowDelivered'),
              value: overview.funnel.deliveredCount,
            },
            {
              label: t('flowBooked'),
              value: overview.funnel.reportedBookingCount,
            },
          ]}
          title={t('campaignFlow')}
        />
      </ContentSection>

      <ContentSection
        framed={false}
        title={t('recentCampaigns')}
      >
        {overview.recentCampaigns.length > 0 ? (
          <OverviewRecentCampaignsTable campaigns={overview.recentCampaigns} />
        ) : (
          <p className={textStyles.mutedP}>
            {t('recentCampaignsEmpty')}
          </p>
        )}
      </ContentSection>
    </div>
  );
}

function AttentionItem({
  item,
  labels,
  overview,
}: {
  item: OverviewResponse["attentionItems"][number];
  labels: OverviewAttentionLabels;
  overview: OverviewResponse;
}) {
  const t = useTranslations('Overview');
  const view = attentionItemView(item, overview, labels);

  return (
    <Item className="px-5 py-5" role="listitem">
      <ItemMedia>
        <AlertTriangle
          aria-hidden="true"
          className={cn(
            "size-4",
            item.tone === "critical"
              ? "text-rose-500"
              : item.tone === "warning"
                ? "text-amber-500"
                : "text-muted-foreground",
          )}
        />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{view.title}</ItemTitle>
        <ItemDescription>{view.description}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button asChild className="shrink-0" size="sm" variant="outline">
          <Link href={attentionActionHref(item.action)}>
            {t('open')}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </Button>
      </ItemActions>
    </Item>
  );
}

function createAttentionLabels(
  t: ReturnType<typeof useTranslations<'Overview'>>,
): OverviewAttentionLabels {
  return {
    billingAccessInactiveDescription: t('attention.billingAccessInactiveDescription'),
    billingAccessInactiveTitle: t('attention.billingAccessInactiveTitle'),
    billingPlanRequiredDescription: t('attention.billingPlanRequiredDescription'),
    billingPlanRequiredTitle: t('attention.billingPlanRequiredTitle'),
    campaignFailedDescription: t('attention.campaignFailedDescription'),
    campaignFailedTitle: t('attention.campaignFailedTitle'),
    creditsEmptyDescription: t('attention.creditsEmptyDescription'),
    creditsEmptyTitle: t('attention.creditsEmptyTitle'),
    creditsLowDescription: t('attention.creditsLowDescription'),
    creditsLowTitle: t('attention.creditsLowTitle'),
    reportBookingsDescription: t('attention.reportBookingsDescription'),
    reportBookingsTitle: t('attention.reportBookingsTitle'),
    reviewFallbackDescription: t('attention.reviewFallbackDescription'),
    reviewFallbackTitle: t('attention.reviewFallbackTitle'),
    senderReleaseDescription: t('attention.senderReleaseDescription'),
    senderReleaseTitle: t('attention.senderReleaseTitle'),
    unreadConversationsDescription: t('attention.unreadConversationsDescription'),
    unreadConversationsTitle: (count) =>
      t('attention.unreadConversationsTitle', { count }),
  };
}

function attentionActionHref(action: OverviewAttentionAction) {
  if (action === "open_inbox") return routes.inbox;
  if (action === "open_billing") return routes.billing;
  if (action === "open_legal") return routes.legal;
  if (action === "open_campaign") return routes.campaigns;
  return routes.campaigns;
}
