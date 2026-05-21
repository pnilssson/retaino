const GSM_7_BASIC_CHARACTERS =
  '@\u00a3$\u00a5\u00e8\u00e9\u00f9\u00ec\u00f2\u00c7\n\u00d8\u00f8\r\u00c5\u00e5\u0394_\u03a6\u0393\u039b\u03a9\u03a0\u03a8\u03a3\u0398\u039e\u00c6\u00e6\u00df\u00c9 !"#\u00a4%&\'()*+,-./0123456789:;<=>?\u00a1ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00c4\u00d6\u00d1\u00dc\u00a7\u00bfabcdefghijklmnopqrstuvwxyz\u00e4\u00f6\u00f1\u00fc\u00e0';

const GSM_7_EXTENSION_CHARACTERS = '^{}\\[~]|\u20ac';

const GSM_7_SINGLE_SEGMENT_LIMIT = 160;
const GSM_7_MULTI_SEGMENT_LIMIT = 153;
const UNICODE_SINGLE_SEGMENT_LIMIT = 70;
const UNICODE_MULTI_SEGMENT_LIMIT = 67;

const DEFAULT_TRACKED_BOOKING_LINK = 'https://go.retaino.com/r/abc123';
export const DEFAULT_SMS_OPT_OUT_TEXT = 'Reply STOP to opt out';

export type SmsEncoding = 'gsm7' | 'unicode';

export type SmsMessageEstimate = {
  encoding: SmsEncoding;
  segments: number;
  smsLength: number;
};

export type CampaignSmsRecipientValues = {
  firstName?: string | null;
  lastBookingDate?: string | null;
};

export type CampaignSmsPreviewInput = {
  smsBody: string;
  trackedBookingLink?: string;
};

export type CampaignSmsPreview = {
  encoding: SmsEncoding;
  estimatedSmsPerRecipient: number;
  optOutText: string;
  renderedBody: string;
  smsLength: number;
};

export type CampaignSmsRenderInput = {
  optOutText?: string;
  recipient?: CampaignSmsRecipientValues;
  smsBody: string;
  trackedBookingLink: string;
};

export function createCampaignSmsPreview({
  smsBody,
  trackedBookingLink = DEFAULT_TRACKED_BOOKING_LINK,
}: CampaignSmsPreviewInput): CampaignSmsPreview {
  return renderCampaignSms({
    recipient: {
      firstName: 'Anna',
      lastBookingDate: 'Feb 14, 2026',
    },
    smsBody,
    trackedBookingLink,
  });
}

export function renderCampaignSms({
  optOutText = DEFAULT_SMS_OPT_OUT_TEXT,
  recipient,
  smsBody,
  trackedBookingLink,
}: CampaignSmsRenderInput): CampaignSmsPreview {
  const renderedUserBody = renderCampaignSmsBody(smsBody, recipient);
  const renderedBody = [renderedUserBody, trackedBookingLink, optOutText]
    .map((section) => section.trim())
    .filter(Boolean)
    .join('\n\n');
  const estimate = estimateSmsMessage(renderedBody);

  return {
    encoding: estimate.encoding,
    estimatedSmsPerRecipient: estimate.segments,
    optOutText,
    renderedBody,
    smsLength: estimate.smsLength,
  };
}

export function estimateSmsMessage(message: string): SmsMessageEstimate {
  const smsLength = smsMessageLength(message);
  const encoding = isGsm7Message(message) ? 'gsm7' : 'unicode';

  if (smsLength === 0) {
    return {
      encoding,
      segments: 0,
      smsLength,
    };
  }

  const singleSegmentLimit =
    encoding === 'gsm7'
      ? GSM_7_SINGLE_SEGMENT_LIMIT
      : UNICODE_SINGLE_SEGMENT_LIMIT;
  const multiSegmentLimit =
    encoding === 'gsm7' ? GSM_7_MULTI_SEGMENT_LIMIT : UNICODE_MULTI_SEGMENT_LIMIT;

  return {
    encoding,
    segments:
      smsLength <= singleSegmentLimit
        ? 1
        : Math.ceil(smsLength / multiSegmentLimit),
    smsLength,
  };
}

function renderCampaignSmsBody(
  smsBody: string,
  recipient: CampaignSmsRecipientValues = {},
) {
  return smsBody
    .trim()
    .replaceAll('{first_name}', recipient.firstName?.trim() ?? '')
    .replaceAll(
      '{last_booking_date}',
      recipient.lastBookingDate?.trim() ?? '',
    )
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ');
}

function smsMessageLength(message: string) {
  if (!isGsm7Message(message)) {
    return message.length;
  }

  return [...message].reduce((length, character) => {
    return (
      length + (GSM_7_EXTENSION_CHARACTERS.includes(character) ? 2 : 1)
    );
  }, 0);
}

function isGsm7Message(message: string) {
  return [...message].every(
    (character) =>
      GSM_7_BASIC_CHARACTERS.includes(character) ||
      GSM_7_EXTENSION_CHARACTERS.includes(character),
  );
}
