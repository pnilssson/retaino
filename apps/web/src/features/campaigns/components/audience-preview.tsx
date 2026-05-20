"use client";

import type { CampaignAudienceRule } from '@retaino/shared/contracts';
import { ItemNotice } from '@/components/item-notice';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
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
            : 'Try changing the audience rule or refreshing the page.'
        }
        title="Audience preview could not be loaded"
        tone="destructive"
      />
    );
  }

  if (preview.isLoading || !preview.data) {
    return <p className={textStyles.mutedBody}>Loading audience preview…</p>;
  }

  return (
    <div className="grid gap-5">
      <dl className="grid gap-2 sm:grid-cols-4">
        <PreviewMetric
          label="Eligible"
          tone="green"
          value={preview.data.eligibleCount}
        />
        <PreviewMetric
          label="Suppressed"
          tone="slate"
          value={preview.data.suppressedCount}
        />
        <PreviewMetric
          label="Missing phone"
          tone="amber"
          value={preview.data.incompleteCount}
        />
        <PreviewMetric
          label="Missing consent"
          tone="red"
          value={preview.data.missingConsentCount}
        />
      </dl>

      {preview.data.eligibleCount === 0 ? (
        <ItemNotice
          description="No contacts currently match this audience. Change the lapsed days or include contacts without a booking date."
          title="No eligible contacts yet"
        />
      ) : null}
    </div>
  );
}

type PreviewMetricTone = 'amber' | 'green' | 'red' | 'slate';

const previewMetricToneClasses: Record<
  PreviewMetricTone,
  { accent: string; label: string; value: string }
> = {
  amber: {
    accent: 'border-amber-300 dark:border-amber-700',
    label: 'text-amber-800 dark:text-amber-200',
    value: 'text-amber-800 dark:text-amber-200',
  },
  green: {
    accent: 'border-emerald-300 dark:border-emerald-700',
    label: 'text-emerald-800 dark:text-emerald-200',
    value: 'text-emerald-800 dark:text-emerald-200',
  },
  red: {
    accent: 'border-rose-300 dark:border-rose-700',
    label: 'text-rose-800 dark:text-rose-200',
    value: 'text-rose-800 dark:text-rose-200',
  },
  slate: {
    accent: 'border-border',
    label: 'text-slate-800 dark:text-slate-200',
    value: 'text-slate-800 dark:text-slate-200',
  },
};

function PreviewMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: PreviewMetricTone;
  value: number;
}) {
  const toneClasses = previewMetricToneClasses[tone];

  return (
    <div
      className={cn(
        'grid min-h-16 content-center gap-1 border-l pl-3',
        toneClasses.accent,
      )}
    >
      <dt className={cn(textStyles.meta, toneClasses.label)}>{label}</dt>
      <dd className={cn(textStyles.metric, toneClasses.value)}>
        {value}
      </dd>
    </div>
  );
}
