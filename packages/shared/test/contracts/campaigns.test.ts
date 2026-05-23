import { describe, expect, it } from 'vitest';
import {
  campaignAudiencePreviewRequestSchema,
  campaignAudiencePreviewResponseSchema,
  campaignAudienceRuleSchema,
  campaignReportResponseSchema,
  createManualBookingReportSchema,
  campaignRecipientSummaryResponseSchema,
  campaignSendResponseSchema,
  campaignSmsPreviewResponseSchema,
  campaignSmsTestSendRequestSchema,
  campaignSmsTestSendResponseSchema,
  campaignSchema,
  createCampaignDraftSchema,
  organizationSmsSenderResponseSchema,
  provisionOrganizationSmsSenderSchema,
  MAX_MANUAL_BOOKING_REPORT_ROWS,
  smsSenderCountriesResponseSchema,
  smsSenderNumbersRequestSchema,
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
        readyToSendAt: null,
        readyToSendByUserId: null,
        sendStartedAt: null,
        sentAt: null,
        failedAt: null,
        failureReason: null,
        reservedCreditCount: null,
        actualCreditCount: null,
        createdAt: '2026-05-16T00:00:00.000Z',
        updatedAt: '2026-05-16T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('allows draft campaigns to be created before message and booking are complete', () => {
    expect(
      createCampaignDraftSchema.parse({
        name: 'June reactivation',
        audienceRule: {
          lapsedDays: 90,
          includeNoBookingDate: false,
        },
      }),
    ).toMatchObject({
      bookingUrl: null,
      campaignCode: null,
      smsBody: null,
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
        smsBody: null,
        bookingUrl: null,
        campaignCode: null,
        attributionWindowDays: 7,
        readyToSendAt: null,
        readyToSendByUserId: null,
        sendStartedAt: null,
        sentAt: null,
        failedAt: null,
        failureReason: null,
        reservedCreditCount: null,
        actualCreditCount: null,
        createdAt: '2026-05-16T00:00:00.000Z',
        updatedAt: '2026-05-16T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('uses ready_to_send as the internal pre-send campaign status', () => {
    expect(
      campaignSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        createdByUserId: '33333333-3333-4333-8333-333333333333',
        name: 'June reactivation',
        status: 'ready_to_send',
        audienceRule: {
          lapsedDays: 90,
          includeNoBookingDate: false,
        },
        smsBody: 'We have openings this week.',
        bookingUrl: 'https://booking.example.com/studio',
        campaignCode: null,
        attributionWindowDays: 7,
        readyToSendAt: '2026-05-16T10:00:00.000Z',
        readyToSendByUserId: '33333333-3333-4333-8333-333333333333',
        sendStartedAt: null,
        sentAt: null,
        failedAt: null,
        failureReason: null,
        reservedCreditCount: null,
        actualCreditCount: null,
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

  it('defaults audience preview to 90 lapsed days without missing booking dates', () => {
    expect(campaignAudiencePreviewRequestSchema.parse({})).toEqual({
      audienceRule: {
        lapsedDays: 90,
        includeNoBookingDate: false,
      },
    });
  });

  it('accepts audience preview responses', () => {
    expect(
      campaignAudiencePreviewResponseSchema.safeParse({
        eligibleCount: 12,
        suppressedCount: 2,
        incompleteCount: 3,
        missingConsentCount: 4,
        sampleContacts: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Ada Lovelace',
            phone: '+46700000000',
            lastBookingAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }).success,
    ).toBe(true);
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

  it('accepts public SMS sender countries and number searches', () => {
    expect(
      smsSenderCountriesResponseSchema.parse({
        countries: [
          {
            countryCode: 'se',
            label: 'Sweden',
            selfServeAvailable: true,
          },
        ],
      }),
    ).toEqual({
      countries: [
        {
          countryCode: 'SE',
          label: 'Sweden',
          selfServeAvailable: true,
        },
      ],
    });

    expect(
      smsSenderNumbersRequestSchema.parse({
        countryCode: 'us',
      }),
    ).toEqual({
      countryCode: 'US',
    });

    expect(() =>
      smsSenderNumbersRequestSchema.parse({
        countryCode: 'SE',
        numberType: 'local',
      }),
    ).toThrow();
  });

  it('accepts the selected sender needed for provisioning', () => {
    expect(
      provisionOrganizationSmsSenderSchema.safeParse({
        selectedSender: {
          phoneNumber: '+46700000000',
          countryCode: 'SE',
        },
      }).success,
    ).toBe(true);
  });

  it('accepts campaign send response contracts', () => {
    const campaign = {
      id: '55555555-5555-4555-8555-555555555555',
      organizationId: '22222222-2222-4222-8222-222222222222',
      createdByUserId: '33333333-3333-4333-8333-333333333333',
      name: 'June reactivation',
      status: 'ready_to_send',
      audienceRule: {
        lapsedDays: 90,
        includeNoBookingDate: false,
      },
      smsBody: 'We have openings this week.',
      bookingUrl: 'https://booking.example.com/studio',
      campaignCode: null,
      attributionWindowDays: 7,
      readyToSendAt: '2026-05-16T10:00:00.000Z',
      readyToSendByUserId: '33333333-3333-4333-8333-333333333333',
      sendStartedAt: null,
      sentAt: null,
      failedAt: null,
      failureReason: null,
      reservedCreditCount: null,
      actualCreditCount: null,
      createdAt: '2026-05-16T00:00:00.000Z',
      updatedAt: '2026-05-16T10:00:00.000Z',
    };

    expect(
      campaignRecipientSummaryResponseSchema.safeParse({
        recipientCount: 1,
      }).success,
    ).toBe(true);
    expect(
      campaignSendResponseSchema.safeParse({
        campaign,
        recipientCount: 1,
        sendStatus: 'queued',
      }).success,
    ).toBe(true);
  });

  it('accepts campaign SMS preview and test-send contracts', () => {
    expect(
      campaignSmsPreviewResponseSchema.safeParse({
        preview: {
          renderedBody:
            'Hi Anna\n\nhttps://go.retaino.com/r/abc123\n\nReply STOP to opt out',
          smsLength: 70,
          estimatedSmsPerRecipient: 1,
          optOutText: 'Reply STOP to opt out',
        },
      }).success,
    ).toBe(true);

    expect(
      campaignSmsTestSendRequestSchema.parse({
        testPhone: '0700000000',
      }),
    ).toEqual({
      testPhone: '0700000000',
    });

    expect(
      campaignSmsTestSendResponseSchema.safeParse({
        testSend: {
          to: '+46700000000',
          renderedBody:
            'Hi Anna\n\nhttps://go.retaino.com/r/abc123\n\nReply STOP to opt out',
          estimatedSmsPerRecipient: 1,
          chargedCredits: 1,
          status: 'queued',
        },
      }).success,
    ).toBe(true);
  });

  it('keeps provider sender IDs out of public sender response contracts', () => {
    const response = organizationSmsSenderResponseSchema.parse({
      sender: {
        id: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        status: 'ready',
        phoneNumber: '+46700000000',
        countryCode: 'SE',
        regulatoryStatus: 'not_required',
        failureReason: null,
        provisionedAt: '2026-05-18T00:00:00.000Z',
        lastVerifiedAt: '2026-05-18T00:00:00.000Z',
        createdAt: '2026-05-18T00:00:00.000Z',
        updatedAt: '2026-05-18T00:00:00.000Z',
      },
    });

    expect(response.sender).not.toHaveProperty('provider');
    expect(response.sender).not.toHaveProperty('providerMessagingServiceId');
    expect(response.sender).not.toHaveProperty('providerPhoneNumberId');
    expect(response.sender).not.toHaveProperty('numberType');
  });

  it('accepts campaign report responses', () => {
    expect(
      campaignReportResponseSchema.safeParse({
        report: {
          selectedCount: 10,
          queuedCount: 0,
          sentCount: 9,
          deliveredCount: 8,
          failedCount: 1,
          skippedCount: 1,
          optOutCount: 1,
          inboundReplyCount: 2,
          clickCount: 4,
          uniqueClickerCount: 3,
          estimatedSmsSegments: 10,
          actualSmsSegments: 9,
          segmentEstimateDrift: -1,
          manualOutcome: {
            bookingCount: 2,
            revenueAmountMinor: 320000,
            currency: 'SEK',
            hasMixedCurrencies: false,
            bookingRate: 0.25,
            revenuePerDeliveredRecipientMinor: 40000,
          },
          bookingReports: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              campaignId: '22222222-2222-4222-8222-222222222222',
              source: 'manual',
              status: 'completed',
              checkedThroughDate: '2026-05-22',
              note: 'Checked Bokadirekt',
              bookingCount: 2,
              revenueAmountMinor: 320000,
              currency: 'SEK',
              hasMixedCurrencies: false,
              createdByUserId: '33333333-3333-4333-8333-333333333333',
              createdAt: '2026-05-22T10:00:00.000Z',
            },
          ],
        },
      }).success,
    ).toBe(true);
  });

  it('accepts a manual booking report with multiple rows', () => {
    expect(
      createManualBookingReportSchema.parse({
        checkedThroughDate: '2026-05-22',
        note: 'Checked campaign code',
        bookings: [
          {
            bookingDate: '2026-05-21',
            customerName: 'Ada Lovelace',
            phone: '0700000000',
            revenueAmount: '1250,50',
            service: 'Cut and color',
          },
          {
            bookingDate: '2026-05-22',
            email: 'grace@example.com',
            note: 'Called after SMS',
          },
        ],
      }),
    ).toMatchObject({
      checkedThroughDate: '2026-05-22',
      bookings: [
        {
          bookingDate: '2026-05-21',
          revenueAmount: '1250,50',
        },
        {
          bookingDate: '2026-05-22',
          email: 'grace@example.com',
        },
      ],
    });
  });

  it('rejects empty manual booking reports and empty booking rows', () => {
    expect(
      createManualBookingReportSchema.safeParse({
        bookings: [],
      }).success,
    ).toBe(false);
    expect(
      createManualBookingReportSchema.safeParse({
        bookings: [
          {
            bookingDate: '2026-05-22',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('caps manual booking reports to lightweight batches', () => {
    expect(
      createManualBookingReportSchema.safeParse({
        bookings: Array.from(
          { length: MAX_MANUAL_BOOKING_REPORT_ROWS + 1 },
          () => ({
            bookingDate: '2026-05-22',
            customerName: 'Ada Lovelace',
          }),
        ),
      }).success,
    ).toBe(false);
  });

  it('caps manual booking report text fields', () => {
    expect(
      createManualBookingReportSchema.safeParse({
        note: 'x'.repeat(501),
        bookings: [
          {
            bookingDate: '2026-05-22',
            customerName: 'Ada Lovelace',
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      createManualBookingReportSchema.safeParse({
        bookings: [
          {
            bookingDate: '2026-05-22',
            customerName: 'x'.repeat(121),
          },
        ],
      }).success,
    ).toBe(false);
  });
});
