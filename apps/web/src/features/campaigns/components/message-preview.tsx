"use client";

import { createCampaignSmsPreview } from '@retaino/shared';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function MessageEstimate({ smsBody }: { smsBody: string }) {
  const preview = createCampaignSmsPreview({ smsBody });
  const hasBody = Boolean(smsBody.trim());
  const estimatedSmsLabel = hasBody
    ? `${preview.estimatedSmsPerRecipient} SMS per recipient`
    : 'Not ready';

  return (
    <p className={textStyles.meta}>
      {hasBody ? preview.smsLength : 0} characters
      {', '}
      {estimatedSmsLabel}
    </p>
  );
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
        <p className={textStyles.metaStrong}>Recipient preview</p>
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
