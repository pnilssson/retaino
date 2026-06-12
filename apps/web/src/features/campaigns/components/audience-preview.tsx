"use client";

import type { CampaignAudienceRule } from '@retaino/shared/contracts';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  History,
  PhoneOff,
  ShieldOff,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Campaigns');
  const preview = useCampaignAudiencePreview({
    audienceRule,
    enabled,
    organizationId,
  });

  if (!enabled) {
    return (
      <ItemNotice
        description={t('audiencePreviewWaitingDescription')}
        title={t('audiencePreviewWaitingTitle')}
      />
    );
  }

  if (preview.isError) {
    return (
      <ItemNotice
        description={
          preview.error instanceof Error
            ? preview.error.message
            : t('audiencePreviewLoadErrorDescription')
        }
        title={t('audiencePreviewLoadErrorTitle')}
        variant="error"
      />
    );
  }

  if (preview.isLoading || !preview.data) {
    return <p className={textStyles.mutedBody}>{t('loadingAudiencePreview')}</p>;
  }

  const audienceNodes = createAudienceNodes(t);
  const audienceLinks = createAudienceLinks(preview.data);
  const audienceSummary = createAudienceSummary(preview.data, t);

  return (
    <div className="grid gap-5">
      <SankeyBreakdown
        links={audienceLinks}
        nodes={audienceNodes}
        showHeader={false}
        summary={audienceSummary}
        title={t('audienceBreakdown')}
      />

      {preview.data.eligibleCount === 0 ? (
        <ItemNotice
          description={t('noEligibleContactsDescription')}
          title={t('noEligibleContactsTitle')}
        />
      ) : null}
    </div>
  );
}

type AudiencePreviewData = {
  baseEligibleCount: number;
  eligibleCount: number;
  incompleteCount: number;
  missingConsentCount: number;
  recentCampaignExcludedCount: number;
  selectedCampaignsExcludedCount: number;
  suppressedCount: number;
};

type CampaignsT = ReturnType<typeof useTranslations<'Campaigns'>>;

function createAudienceNodes(t: CampaignsT): SankeyBreakdownNode[] {
  return [
    {
      color: 'var(--chart-3)',
      name: t('matchingContacts'),
    },
    {
      color: 'var(--chart-2)',
      name: t('canReceiveSms'),
    },
    {
      color: 'var(--chart-4)',
      name: t('needsAttention'),
    },
    {
      color: 'var(--chart-2)',
      name: t('finalSendable'),
    },
    {
      color: 'var(--chart-5)',
      name: t('recentlyContacted'),
    },
    {
      color: 'var(--chart-3)',
      name: t('previousCampaigns'),
    },
    {
      color: 'var(--muted-foreground)',
      name: t('suppressed'),
    },
    {
      color: 'var(--chart-1)',
      name: t('missingPhone'),
    },
    {
      color: 'var(--destructive)',
      name: t('missingConsent'),
    },
  ];
}

function createAudienceLinks(data: AudiencePreviewData): SankeyBreakdownLink[] {
  const attentionCount =
    data.suppressedCount + data.incompleteCount + data.missingConsentCount;

  return [
    { source: 0, target: 1, value: data.baseEligibleCount },
    { source: 0, target: 2, value: attentionCount },
    { source: 1, target: 3, value: data.eligibleCount },
    { source: 1, target: 4, value: data.recentCampaignExcludedCount },
    { source: 1, target: 5, value: data.selectedCampaignsExcludedCount },
    { source: 2, target: 6, value: data.suppressedCount },
    { source: 2, target: 7, value: data.incompleteCount },
    { source: 2, target: 8, value: data.missingConsentCount },
  ];
}

function createAudienceSummary(
  data: AudiencePreviewData,
  t: CampaignsT,
): SankeyBreakdownSummaryItem[] {
  return [
    {
      icon: CheckCircle2,
      iconClassName: 'bg-emerald-50 text-emerald-700',
      label: t('finalSendable'),
      value: data.eligibleCount,
    },
    {
      icon: Clock3,
      iconClassName: 'bg-sky-50 text-sky-700',
      label: t('recentlyContacted'),
      value: data.recentCampaignExcludedCount,
    },
    {
      icon: History,
      iconClassName: 'bg-violet-50 text-violet-700',
      label: t('previousCampaigns'),
      value: data.selectedCampaignsExcludedCount,
    },
    {
      icon: ShieldOff,
      iconClassName: 'bg-rose-50 text-rose-700',
      label: t('suppressed'),
      value: data.suppressedCount,
    },
    {
      icon: PhoneOff,
      iconClassName: 'bg-amber-50 text-amber-700',
      label: t('missingPhone'),
      value: data.incompleteCount,
    },
    {
      icon: AlertCircle,
      iconClassName: 'bg-rose-50 text-rose-700',
      label: t('missingConsent'),
      value: data.missingConsentCount,
    },
  ];
}
