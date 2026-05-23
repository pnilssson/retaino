import type {
  Campaign,
  CampaignAudienceRule,
  CreateCampaignDraftInput,
  UpdateCampaignDraftInput,
} from '@retaino/shared/contracts';

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
  | 'booking'
  | 'sender'
  | 'test'
  | 'review';

export const defaultCampaignFormValues: CampaignFormValues = {
  name: '',
  audienceRule: {
    lapsedDays: 90,
    includeNoBookingDate: false,
  },
  smsBody: '',
  bookingUrl: '',
  campaignCode: '',
  attributionWindowDays: 7,
};

export function campaignToFormValues(campaign: Campaign): CampaignFormValues {
  return {
    name: campaign.name,
    audienceRule: campaign.audienceRule,
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

export function campaignFormValuesToMessageInput(
  values: CampaignFormValues,
): UpdateCampaignDraftInput {
  return {
    smsBody: values.smsBody,
  };
}

export function campaignFormValuesToBookingInput(
  values: CampaignFormValues,
): UpdateCampaignDraftInput {
  return {
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
  testSmsStepComplete = false,
): CampaignStepId[] {
  const completed: CampaignStepId[] = [];

  if (isAudienceStepComplete(values)) {
    completed.push('audience');
  }

  if (isMessageStepComplete(values)) {
    completed.push('message');
  }

  if (isBookingStepComplete(values)) {
    completed.push('booking');
  }

  if (senderReady) {
    completed.push('sender');
  }

  if (testSmsStepComplete) {
    completed.push('test');
  }

  if (
    isAudienceStepComplete(values) &&
    isMessageStepComplete(values) &&
    isBookingStepComplete(values) &&
    senderReady &&
    testSmsStepComplete
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

export function isMessageStepComplete(values: CampaignFormValues) {
  return !validateSmsBody(values.smsBody);
}

export function isBookingStepComplete(values: CampaignFormValues) {
  return !validateBookingUrl(values.bookingUrl);
}

export function campaignStatusNotice(campaign: Campaign) {
  if (campaign.status === 'ready_to_send') {
    return {
      title: 'Campaign is ready to send',
      description:
        'Recipients have been selected for this campaign. Campaign details are locked so the send uses this exact audience and message.',
    };
  }

  if (campaign.status === 'sending') {
    return {
      title: 'Campaign send is in progress',
      description:
        'Messages are being sent in the background. Campaign details are locked while the send runs.',
    };
  }

  if (campaign.status === 'sent') {
    return {
      title: 'Campaign has been sent',
      description:
        'Messages were sent to the selected recipients. Campaign details are locked.',
    };
  }

  if (campaign.status === 'failed') {
    return {
      title: 'Campaign send needs attention',
      description:
        'The send did not finish. Review the campaign status before trying again.',
    };
  }

  return null;
}

export function campaignSendStatusText(campaign: Campaign) {
  if (campaign.status === 'sending') {
    return campaign.sendStartedAt
      ? `Sending started ${formatDateTime(campaign.sendStartedAt)}.`
      : 'Sending is in progress.';
  }

  if (campaign.status === 'sent') {
    return campaign.sentAt
      ? `Sent ${formatDateTime(campaign.sentAt)}.`
      : 'Campaign sent.';
  }

  if (campaign.status === 'failed') {
    const failedAt = campaign.failedAt
      ? `Send failed ${formatDateTime(campaign.failedAt)}.`
      : 'Send failed.';

    return campaign.failureReason
      ? `${failedAt} ${campaign.failureReason}`
      : failedAt;
  }

  return campaign.readyToSendAt
    ? `Ready to send since ${formatDateTime(campaign.readyToSendAt)}.`
    : 'Ready to send.';
}

export function validateRequired(value: string, message: string) {
  return value.trim() ? undefined : message;
}

export function validateLapsedDays(value: number) {
  return Number.isInteger(value) && value >= 30 && value <= 365
    ? undefined
    : 'Choose a value from 30 to 365 days.';
}

export function validateBookingUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? undefined
      : 'Enter an http or https booking URL.';
  } catch {
    return 'Enter an http or https booking URL.';
  }
}

export function validateSmsBody(value: string) {
  if (!value.trim()) {
    return 'Enter the SMS message.';
  }

  const withoutAllowedTokens = value.replace(
    /\{(first_name|last_booking_date)\}/g,
    '',
  );

  return /[{}]/.test(withoutAllowedTokens)
    ? 'Only {first_name} and {last_booking_date} are supported.'
    : undefined;
}

export function isPreviewableAudienceRule(rule: CampaignAudienceRule) {
  return (
    Number.isInteger(rule.lapsedDays) &&
    rule.lapsedDays >= 30 &&
    rule.lapsedDays <= 365
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
