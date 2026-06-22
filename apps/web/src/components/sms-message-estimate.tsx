"use client";

import {
  createCampaignSmsPreview,
  estimateSmsMessage,
} from '@retaino/shared';
import { useTranslations } from 'next-intl';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

type SmsMessageEstimateMode = 'campaign' | 'plain';

export function SmsMessageEstimate({
  body,
  className,
  mode = 'plain',
}: {
  body: string;
  className?: string;
  mode?: SmsMessageEstimateMode;
}) {
  const t = useTranslations('Common');

  return (
    <p className={cn(textStyles.small, className)}>
      {smsMessageEstimateText({
        body,
        labels: {
          characters: (count) => t('characters', { count }),
          credit: (count) => t('credit', { count }),
          creditPerRecipient: (count) => t('creditPerRecipient', { count }),
          credits: (count) => t('credits', { count }),
          creditsPerRecipient: (count) => t('creditsPerRecipient', { count }),
          smsEstimate: (characters, credits) =>
            t('smsEstimate', { characters, credits }),
        },
        mode,
      })}
    </p>
  );
}

function smsMessageEstimateText({
  body,
  labels,
  mode = 'plain',
}: {
  body: string;
  labels: {
    characters: (count: number) => string;
    credit: (count: number) => string;
    creditPerRecipient: (count: number) => string;
    credits: (count: number) => string;
    creditsPerRecipient: (count: number) => string;
    smsEstimate: (characters: string, credits: string) => string;
  };
  mode?: SmsMessageEstimateMode;
}) {
  const hasBody = Boolean(body.trim());

  const { characters, credits } =
    mode === 'campaign'
      ? campaignEstimateValues(body)
      : plainEstimateValues(body);
  const shownCredits = hasBody ? credits : 0;
  const creditLabel =
    mode === 'campaign'
      ? shownCredits === 1
        ? labels.creditPerRecipient(shownCredits)
        : labels.creditsPerRecipient(shownCredits)
      : shownCredits === 1
        ? labels.credit(shownCredits)
        : labels.credits(shownCredits);

  return labels.smsEstimate(labels.characters(hasBody ? characters : 0), creditLabel);
}

function campaignEstimateValues(body: string) {
  const estimate = createCampaignSmsPreview({ smsBody: body });

  return {
    characters: estimate.smsLength,
    credits: estimate.estimatedSmsPerRecipient,
  };
}

function plainEstimateValues(body: string) {
  const estimate = estimateSmsMessage(body);

  return {
    characters: estimate.smsLength,
    credits: estimate.segments,
  };
}
