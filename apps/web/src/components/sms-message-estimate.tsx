"use client";

import {
  createCampaignSmsPreview,
  estimateSmsMessage,
} from '@retaino/shared';
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
  return (
    <p className={cn(textStyles.meta, className)}>
      {smsMessageEstimateText({ body, mode })}
    </p>
  );
}

export function smsMessageEstimateText({
  body,
  mode = 'plain',
}: {
  body: string;
  mode?: SmsMessageEstimateMode;
}) {
  const hasBody = Boolean(body.trim());

  const { characters, credits } =
    mode === 'campaign'
      ? campaignEstimateValues(body)
      : plainEstimateValues(body);
  const shownCredits = hasBody ? credits : 0;
  const creditLabel = `${shownCredits} ${
    shownCredits === 1 ? 'credit' : 'credits'
  }${mode === 'campaign' ? ' per recipient' : ''}`;

  return `${hasBody ? characters : 0} characters, ${creditLabel}`;
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
