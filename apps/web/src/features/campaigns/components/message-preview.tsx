"use client";

import { createCampaignSmsPreview } from '@retaino/shared';
import { useTranslations } from 'next-intl';
import { SmsMessageEstimate } from '@/components/sms-message-estimate';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function MessageEstimate({ smsBody }: { smsBody: string }) {
  return <SmsMessageEstimate body={smsBody} mode="campaign" />;
}

export function MessagePreview({
  showLabel = true,
  smsBody,
}: {
  showLabel?: boolean;
  smsBody: string;
}) {
  const t = useTranslations('Campaigns');
  const preview = createCampaignSmsPreview({ smsBody });
  const hasBody = Boolean(smsBody.trim());

  return (
    <div className="grid content-start gap-2">
      {showLabel ? (
        <p className={textStyles.itemTitle}>{t('messagePreview')}</p>
      ) : null}
      <div
        className={cn(
          'min-h-36 rounded-lg bg-muted px-3 py-2',
          hasBody ? textStyles.body : textStyles.mutedBody,
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {hasBody ? preview.renderedBody : t('smsPreviewPlaceholder')}
        </p>
      </div>
    </div>
  );
}
