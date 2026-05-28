import { describe, expect, it } from 'vitest';
import {
  createCampaignSmsPreview,
  estimateSmsMessage,
  renderCampaignSms,
} from '../src';

describe('SMS preview helpers', () => {
  it('renders campaign messages with sample personalization and required appendices', () => {
    expect(
      createCampaignSmsPreview({
        smsBody: 'Hi {first_name}, your last visit was {last_booking_date}.',
      }),
    ).toMatchObject({
      estimatedSmsPerRecipient: 1,
      renderedBody:
        'Hi Anna, your last visit was Feb 14, 2026.\n\nhttps://go.retaino.io/r/abc123\n\nReply STOP to opt out',
    });
  });

  it('uses SMS length naming for billing-aware preview length', () => {
    const preview = createCampaignSmsPreview({
      smsBody: 'Hi {first_name}, book again.',
    });

    expect(preview).toHaveProperty('smsLength');
  });

  it('estimates longer messages as more SMS per recipient', () => {
    expect(
      createCampaignSmsPreview({
        smsBody: 'A'.repeat(260),
      }).estimatedSmsPerRecipient,
    ).toBe(3);
  });

  it('accounts for emoji when estimating SMS per recipient', () => {
    expect(
      createCampaignSmsPreview({
        smsBody: '\u{1f600}'.repeat(30),
      }).estimatedSmsPerRecipient,
    ).toBe(2);
  });

  it('renders campaign messages with exact recipient values', () => {
    expect(
      renderCampaignSms({
        recipient: {
          firstName: 'Christopher',
          lastBookingDate: 'May 1, 2026',
        },
        smsBody:
          'Hi {first_name}, your last booking was {last_booking_date}.',
        trackedBookingLink: 'https://go.retaino.io/r/live1',
      }),
    ).toMatchObject({
      estimatedSmsPerRecipient: 1,
      optOutText: 'Reply STOP to opt out',
      renderedBody:
        'Hi Christopher, your last booking was May 1, 2026.\n\nhttps://go.retaino.io/r/live1\n\nReply STOP to opt out',
    });
  });

  it('uses clean empty fallbacks for missing recipient values', () => {
    expect(
      renderCampaignSms({
        recipient: {
          firstName: null,
          lastBookingDate: null,
        },
        smsBody: 'Hi {first_name}, book again.',
        trackedBookingLink: 'https://go.retaino.io/r/live2',
      }).renderedBody,
    ).toBe(
      'Hi, book again.\n\nhttps://go.retaino.io/r/live2\n\nReply STOP to opt out',
    );
  });

  it('returns provider-ready SMS estimate details', () => {
    expect(estimateSmsMessage('^{}\\[~]|\u20ac')).toEqual({
      encoding: 'gsm7',
      smsLength: 18,
      segments: 1,
    });

    expect(estimateSmsMessage('Smart quote: \u201c')).toMatchObject({
      encoding: 'unicode',
      segments: 1,
    });
  });
});
