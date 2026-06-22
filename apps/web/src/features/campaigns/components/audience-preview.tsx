"use client";

import type { CampaignAudienceRule } from '@retaino/shared/contracts';
import {
  AlertCircle,
  Clock3,
  History,
  PhoneOff,
  ShieldOff,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  FunnelBreakdown,
  type FunnelBreakdownMetric,
  type FunnelBreakdownStage,
} from '@/components/funnel-breakdown';
import { ItemNotice } from '@/components/item-notice';
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
    return <p className={textStyles.mutedP}>{t('loadingAudiencePreview')}</p>;
  }

  const audienceStages = createAudienceStages(preview.data, t);
  const audienceMetrics = createAudienceMetrics(preview.data, t);

  return (
    <div className="grid gap-5">
      <FunnelBreakdown
        metrics={audienceMetrics}
        stages={audienceStages}
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

function createAudienceStages(
  data: AudiencePreviewData,
  t: CampaignsT,
): FunnelBreakdownStage[] {
  const attentionCount =
    data.suppressedCount + data.incompleteCount + data.missingConsentCount;

  return [
    {
      label: t('matchingContacts'),
      value: data.baseEligibleCount + attentionCount,
    },
    {
      label: t('canReceiveSms'),
      value: data.baseEligibleCount,
    },
    {
      label: t('finalSendable'),
      value: data.eligibleCount,
    },
  ];
}

function createAudienceMetrics(
  data: AudiencePreviewData,
  t: CampaignsT,
): FunnelBreakdownMetric[] {
  return [
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
