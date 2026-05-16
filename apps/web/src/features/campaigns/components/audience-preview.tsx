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
    return <p className={textStyles.mutedBody}>Loading audience preview.</p>;
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
  { label: string; panel: string; value: string }
> = {
  amber: {
    label: 'text-amber-800 dark:text-amber-200',
    panel: 'border-amber-200 bg-amber-50/55 dark:border-amber-900/60 dark:bg-amber-950/25',
    value: 'text-amber-800 dark:text-amber-200',
  },
  green: {
    label: 'text-emerald-800 dark:text-emerald-200',
    panel: 'border-emerald-200 bg-emerald-50/55 dark:border-emerald-900/60 dark:bg-emerald-950/25',
    value: 'text-emerald-800 dark:text-emerald-200',
  },
  red: {
    label: 'text-rose-800 dark:text-rose-200',
    panel: 'border-rose-200 bg-rose-50/55 dark:border-rose-900/60 dark:bg-rose-950/25',
    value: 'text-rose-800 dark:text-rose-200',
  },
  slate: {
    label: 'text-slate-800 dark:text-slate-200',
    panel: 'border-slate-200 bg-slate-50/70 dark:border-slate-800/70 dark:bg-slate-950/30',
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
        'grid min-h-16 content-center gap-1 rounded-md border px-3 py-2',
        toneClasses.panel,
      )}
    >
      <dt className={cn(textStyles.meta, toneClasses.label)}>{label}</dt>
      <dd className={cn(textStyles.metric, toneClasses.value)}>
        {value}
      </dd>
    </div>
  );
}
