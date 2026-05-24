"use client";

import type { CampaignAudienceRule } from '@retaino/shared/contracts';
import { AlertCircle, CheckCircle2, PhoneOff, ShieldOff } from 'lucide-react';
import { ItemNotice } from '@/components/item-notice';
import {
  SankeyBreakdown,
  type SankeyBreakdownLink,
  type SankeyBreakdownNode,
  type SankeyBreakdownSummaryItem,
} from '@/components/sankey-breakdown';
import { textStyles } from '@/lib/text-styles';
import { useCampaignAudiencePreview } from '../hooks/use-campaign-audience-preview';

export function AudiencePreview({
  audienceRule,
  enabled,
  organizationId,
}: {
  audienceRule: CampaignAudienceRule;
  enabled: boolean;
  organizationId: string | null;
}) {
  const preview = useCampaignAudiencePreview({
    audienceRule,
    enabled,
    organizationId,
  });

  if (!enabled) {
    return (
      <ItemNotice
        description="Complete a valid audience rule to preview matching contacts."
        title="Audience preview is waiting"
      />
    );
  }

  if (preview.isError) {
    return (
      <ItemNotice
        description={
          preview.error instanceof Error
            ? preview.error.message
            : 'Try changing the audience rule or try again in a moment.'
        }
        title="Audience preview could not be loaded"
        variant="error"
      />
    );
  }

  if (preview.isLoading || !preview.data) {
    return <p className={textStyles.mutedBody}>Loading audience preview…</p>;
  }

  const audienceNodes = createAudienceNodes();
  const audienceLinks = createAudienceLinks(preview.data);
  const audienceSummary = createAudienceSummary(preview.data);

  return (
    <div className="grid gap-5">
      <SankeyBreakdown
        links={audienceLinks}
        nodes={audienceNodes}
        showHeader={false}
        summary={audienceSummary}
        title="Audience breakdown"
      />

      {preview.data.eligibleCount === 0 ? (
        <ItemNotice
          description="No contacts currently match this audience. Change the lapsed days or include contacts without a booking date."
          title="No eligible contacts yet"
        />
      ) : null}
    </div>
  );
}

type AudiencePreviewData = {
  eligibleCount: number;
  incompleteCount: number;
  missingConsentCount: number;
  suppressedCount: number;
};

function createAudienceNodes(): SankeyBreakdownNode[] {
  return [
    {
      color: 'var(--chart-3)',
      name: 'Matching contacts',
    },
    {
      color: 'var(--chart-2)',
      name: 'Ready',
    },
    {
      color: 'var(--chart-4)',
      name: 'Needs attention',
    },
    {
      color: 'var(--chart-2)',
      name: 'Eligible',
    },
    {
      color: 'var(--muted-foreground)',
      name: 'Suppressed',
    },
    {
      color: 'var(--chart-1)',
      name: 'Missing phone',
    },
    {
      color: 'var(--destructive)',
      name: 'Missing consent',
    },
  ];
}

function createAudienceLinks(data: AudiencePreviewData): SankeyBreakdownLink[] {
  const attentionCount =
    data.suppressedCount + data.incompleteCount + data.missingConsentCount;

  return [
    { source: 0, target: 1, value: data.eligibleCount },
    { source: 0, target: 2, value: attentionCount },
    { source: 1, target: 3, value: data.eligibleCount },
    { source: 2, target: 4, value: data.suppressedCount },
    { source: 2, target: 5, value: data.incompleteCount },
    { source: 2, target: 6, value: data.missingConsentCount },
  ];
}

function createAudienceSummary(
  data: AudiencePreviewData,
): SankeyBreakdownSummaryItem[] {
  return [
    {
      icon: CheckCircle2,
      iconClassName: 'bg-emerald-50 text-emerald-700',
      label: 'Eligible',
      value: data.eligibleCount,
    },
    {
      icon: ShieldOff,
      iconClassName: 'bg-rose-50 text-rose-700',
      label: 'Suppressed',
      value: data.suppressedCount,
    },
    {
      icon: PhoneOff,
      iconClassName: 'bg-amber-50 text-amber-700',
      label: 'Missing phone',
      value: data.incompleteCount,
    },
    {
      icon: AlertCircle,
      iconClassName: 'bg-rose-50 text-rose-700',
      label: 'Missing consent',
      value: data.missingConsentCount,
    },
  ];
}
