import {
  CAMPAIGN_SEND_FAILURE_MESSAGE,
  normalizeCampaignAudienceRule,
  type Campaign,
  type CampaignAudienceRule,
  type CreateCampaignDraftInput,
  type UpdateCampaignDraftInput,
} from '@retaino/shared/contracts';
import { getIntlLocale } from '@/lib/locale-format';

export type CampaignText = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export type CampaignFormValues = {
  name: string;
  audienceRule: CampaignAudienceRule;
  smsBody: string;
  bookingUrl: string;
  campaignCode: string;
  attributionWindowDays: number;
};

export type CampaignStepId =
  | 'audience'
  | 'message'
  | 'sender'
  | 'review';

export const defaultCampaignFormValues: CampaignFormValues = {
  name: '',
  audienceRule: {
    lapsedDays: 90,
    includeNoBookingDate: false,
    excludeCampaignIds: [],
    recentCampaignExclusionDays: 30,
  },
  smsBody: '',
  bookingUrl: '',
  campaignCode: '',
  attributionWindowDays: 7,
};

export function campaignToFormValues(campaign: Campaign): CampaignFormValues {
  const audienceRule = normalizeCampaignAudienceRule(campaign.audienceRule);

  return {
    name: campaign.name,
    audienceRule,
    smsBody: campaign.smsBody ?? '',
    bookingUrl: campaign.bookingUrl ?? '',
    campaignCode: campaign.campaignCode ?? '',
    attributionWindowDays: campaign.attributionWindowDays,
  };
}

export function campaignFormValuesToInitialDraftInput(
  values: CampaignFormValues,
): CreateCampaignDraftInput {
  return {
    name: values.name,
    audienceRule: values.audienceRule,
    smsBody: null,
    bookingUrl: null,
    campaignCode: null,
    attributionWindowDays: values.attributionWindowDays,
  };
}

export function campaignFormValuesToAudienceInput(
  values: CampaignFormValues,
): UpdateCampaignDraftInput {
  return {
    name: values.name,
    audienceRule: values.audienceRule,
    attributionWindowDays: values.attributionWindowDays,
  };
}

export function campaignFormValuesToMessageAndLinkInput(
  values: CampaignFormValues,
): UpdateCampaignDraftInput {
  return {
    smsBody: values.smsBody,
    bookingUrl: values.bookingUrl,
    campaignCode: values.campaignCode,
  };
}

export function campaignFormValuesToCompleteInput(
  values: CampaignFormValues,
): CreateCampaignDraftInput {
  return {
    name: values.name,
    audienceRule: values.audienceRule,
    smsBody: values.smsBody,
    bookingUrl: values.bookingUrl,
    campaignCode: values.campaignCode,
    attributionWindowDays: values.attributionWindowDays,
  };
}

export function completedCampaignSteps(
  values: CampaignFormValues,
  senderReady: boolean,
): CampaignStepId[] {
  const completed: CampaignStepId[] = [];

  if (isAudienceStepComplete(values)) {
    completed.push('audience');
  }

  if (isMessageAndLinkStepComplete(values)) {
    completed.push('message');
  }

  if (senderReady) {
    completed.push('sender');
  }

  if (
    isAudienceStepComplete(values) &&
    isMessageAndLinkStepComplete(values) &&
    senderReady
  ) {
    completed.push('review');
  }

  return completed;
}

export function isAudienceStepComplete(values: CampaignFormValues) {
  return (
    Boolean(values.name.trim()) && isPreviewableAudienceRule(values.audienceRule)
  );
}

function isMessageStepComplete(values: CampaignFormValues) {
  return isValidSmsBody(values.smsBody);
}

function isBookingStepComplete(values: CampaignFormValues) {
  return isValidBookingUrl(values.bookingUrl);
}

export function isMessageAndLinkStepComplete(values: CampaignFormValues) {
  return isMessageStepComplete(values) && isBookingStepComplete(values);
}

export function campaignStatusNotice(campaign: Campaign, t: CampaignText) {
  if (campaign.status === 'ready_to_send') {
    return {
      title: t('campaignReadyNoticeTitle'),
      description: t('campaignReadyNoticeDescription'),
    };
  }

  if (campaign.status === 'sending') {
    return {
      title: t('campaignSendingNoticeTitle'),
      description: t('campaignSendingNoticeDescription'),
    };
  }

  if (campaign.status === 'sent') {
    return {
      title: t('campaignSentNoticeTitle'),
      description: t('campaignSentNoticeDescription'),
    };
  }

  if (campaign.status === 'failed') {
    return {
      title: t('campaignFailedNoticeTitle'),
      description: t('campaignFailedNoticeDescription'),
    };
  }

  return null;
}

export function campaignSendStatusText(
  campaign: Campaign,
  locale: string,
  t: CampaignText,
) {
  if (campaign.status === 'sending') {
    return campaign.sendStartedAt
      ? t('sendingStartedAt', {
          date: formatDateTime(campaign.sendStartedAt, locale),
        })
      : t('sendingInProgress');
  }

  if (campaign.status === 'sent') {
    return campaign.sentAt
      ? t('sentAt', { date: formatDateTime(campaign.sentAt, locale) })
      : t('campaignSent');
  }

  if (campaign.status === 'failed') {
    const failedAt = campaign.failedAt
      ? t('sendFailedAt', {
          date: formatDateTime(campaign.failedAt, locale),
        })
      : t('sendFailed');

    return `${failedAt} ${CAMPAIGN_SEND_FAILURE_MESSAGE}`;
  }

  return campaign.readyToSendAt
    ? t('readyToSendSince', {
        date: formatDateTime(campaign.readyToSendAt, locale),
      })
    : t('readyToSend');
}

export function validateRequired(value: string, message: string) {
  return value.trim() ? undefined : message;
}

export function validateLapsedDays(value: number, t: CampaignText) {
  return Number.isInteger(value) && value >= 30 && value <= 365
    ? undefined
    : t('chooseLapsedDaysError');
}

export function validateBookingUrl(value: string, t: CampaignText) {
  return isValidBookingUrl(value) ? undefined : t('bookingUrlInvalid');
}

export function validateSmsBody(value: string, t: CampaignText) {
  if (!value.trim()) {
    return t('enterSmsMessage');
  }

  return isValidSmsBody(value)
    ? undefined
    : t('unsupportedSmsTokens', {
        first_name: '{first_name}',
        last_booking_date: '{last_booking_date}',
      });
}

export function isPreviewableAudienceRule(rule: CampaignAudienceRule) {
  return (
    Number.isInteger(rule.lapsedDays) &&
    rule.lapsedDays >= 30 &&
    rule.lapsedDays <= 365
  );
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isValidBookingUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidSmsBody(value: string) {
  if (!value.trim()) {
    return false;
  }

  const withoutAllowedTokens = value.replace(
    /\{(first_name|last_booking_date)\}/g,
    '',
  );

  return !/[{}]/.test(withoutAllowedTokens);
}
