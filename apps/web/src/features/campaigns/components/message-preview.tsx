"use client";

import { createCampaignSmsPreview } from '@retaino/shared';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function MessageEstimate({ smsBody }: { smsBody: string }) {
  return <p className={textStyles.meta}>{messageEstimateText(smsBody)}</p>;
}

export function messageEstimateText(smsBody: string) {
  const preview = createCampaignSmsPreview({ smsBody });
  const hasBody = Boolean(smsBody.trim());
  const estimatedCreditLabel = hasBody
    ? `${preview.estimatedSmsPerRecipient} ${
        preview.estimatedSmsPerRecipient === 1 ? 'credit' : 'credits'
      } per recipient`
    : 'Not ready';

  return `${hasBody ? preview.smsLength : 0} characters, ${estimatedCreditLabel}`;
}

export function MessagePreview({
  showLabel = true,
  smsBody,
}: {
  showLabel?: boolean;
  smsBody: string;
}) {
  const preview = createCampaignSmsPreview({ smsBody });
  const hasBody = Boolean(smsBody.trim());

  return (
    <div className="grid content-start gap-2">
      {showLabel ? (
        <p className={textStyles.itemTitle}>Message preview</p>
      ) : null}
      <div
        className={cn(
          'min-h-36 rounded-lg bg-muted px-3 py-2',
          hasBody ? textStyles.body : textStyles.mutedBody,
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {hasBody ? preview.renderedBody : 'Your SMS preview appears here.'}
        </p>
      </div>
    </div>
  );
}
