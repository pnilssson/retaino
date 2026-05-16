import { describe, expect, it } from 'vitest';
import {
  campaignAudienceRuleSchema,
  campaignSchema,
  createCampaignDraftSchema,
  updateCampaignDraftSchema,
} from '../../src/contracts';

describe('campaign contracts', () => {
  it('accepts valid campaign drafts and response shapes', () => {
    expect(
      createCampaignDraftSchema.parse({
        name: 'June reactivation',
        audienceRule: {
          lapsedDays: 90,
          includeNoBookingDate: false,
        },
        smsBody: 'We have openings this week.',
        bookingUrl: 'https://booking.example.com/studio',
        campaignCode: ' june ',
        attributionWindowDays: 7,
      }),
    ).toMatchObject({
      campaignCode: 'JUNE',
    });

    expect(
      campaignSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        createdByUserId: '33333333-3333-4333-8333-333333333333',
        name: 'June reactivation',
        status: 'draft',
        audienceRule: {
          lapsedDays: 90,
          includeNoBookingDate: false,
        },
        smsBody: 'We have openings this week.',
        bookingUrl: 'https://booking.example.com/studio',
        campaignCode: null,
        attributionWindowDays: 7,
        createdAt: '2026-05-16T00:00:00.000Z',
        updatedAt: '2026-05-16T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid audience rules', () => {
    expect(
      campaignAudienceRuleSchema.safeParse({
        lapsedDays: 29,
        includeNoBookingDate: false,
      }).success,
    ).toBe(false);
    expect(
      campaignAudienceRuleSchema.safeParse({
        lapsedDays: 366,
        includeNoBookingDate: false,
      }).success,
    ).toBe(false);
    expect(
      campaignAudienceRuleSchema.safeParse({
        lapsedDays: 90.5,
        includeNoBookingDate: false,
      }).success,
    ).toBe(false);
  });

  it('rejects non-http booking URLs', () => {
    expect(
      createCampaignDraftSchema.safeParse({
        name: 'June reactivation',
        audienceRule: { lapsedDays: 90, includeNoBookingDate: false },
        smsBody: 'We have openings this week.',
        bookingUrl: 'ftp://booking.example.com/studio',
      }).success,
    ).toBe(false);
    expect(
      createCampaignDraftSchema.safeParse({
        name: 'June reactivation',
        audienceRule: { lapsedDays: 90, includeNoBookingDate: false },
        smsBody: 'We have openings this week.',
        bookingUrl: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
  });

  it('normalizes blank and populated campaign codes', () => {
    expect(
      createCampaignDraftSchema.parse({
        name: 'June reactivation',
        audienceRule: { lapsedDays: 90, includeNoBookingDate: false },
        smsBody: 'We have openings this week.',
        bookingUrl: 'https://booking.example.com/studio',
        campaignCode: ' summer-25 ',
      }).campaignCode,
    ).toBe('SUMMER-25');

    expect(
      updateCampaignDraftSchema.parse({
        campaignCode: '   ',
      }).campaignCode,
    ).toBeNull();
    expect(updateCampaignDraftSchema.parse({})).not.toHaveProperty(
      'campaignCode',
    );
  });

  it('allows supported SMS personalization and rejects unsupported tokens', () => {
    expect(
      createCampaignDraftSchema.safeParse({
        name: 'June reactivation',
        audienceRule: { lapsedDays: 90, includeNoBookingDate: false },
        smsBody: 'Hi {first_name}, last booking was {last_booking_date}.',
        bookingUrl: 'https://booking.example.com/studio',
      }).success,
    ).toBe(true);

    expect(
      createCampaignDraftSchema.safeParse({
        name: 'June reactivation',
        audienceRule: { lapsedDays: 90, includeNoBookingDate: false },
        smsBody: 'Book here: {{link}}',
        bookingUrl: 'https://booking.example.com/studio',
      }).success,
    ).toBe(false);
    expect(
      createCampaignDraftSchema.safeParse({
        name: 'June reactivation',
        audienceRule: { lapsedDays: 90, includeNoBookingDate: false },
        smsBody: 'Book here: {link}',
        bookingUrl: 'https://booking.example.com/studio',
      }).success,
    ).toBe(false);
    expect(
      updateCampaignDraftSchema.safeParse({
        smsBody: 'Hi {customer_name}, we have openings this week.',
      }).success,
    ).toBe(false);
  });
});
