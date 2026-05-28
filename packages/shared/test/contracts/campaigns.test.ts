import { describe, expect, it } from 'vitest';
import {
  campaignAudiencePreviewRequestSchema,
  campaignAudiencePreviewResponseSchema,
  campaignAudienceRuleSchema,
  campaignReportResponseSchema,
  campaignRecipientSearchResponseSchema,
  createReportedBookingsSchema,
  campaignRecipientSummaryResponseSchema,
  campaignSendRequestSchema,
  campaignSendResponseSchema,
  campaignSmsPreviewResponseSchema,
  campaignSmsTestContactSearchResponseSchema,
  campaignSmsTestSendRequestSchema,
  campaignSmsTestSendResponseSchema,
  campaignSchema,
  createCampaignDraftSchema,
  normalizeCampaignAudienceRule,
  organizationSmsSenderResponseSchema,
  provisionOrganizationSmsSenderSchema,
  requiresRecentCampaignExclusionAcknowledgement,
  MAX_REPORTED_BOOKING_ROWS,
  smsSenderCountriesResponseSchema,
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
    expect(
      campaignAudienceRuleSchema.safeParse({
        lapsedDays: 90,
        includeNoBookingDate: false,
        recentCampaignExclusionDays: 21,
      }).success,
    ).toBe(false);
    expect(
      campaignAudienceRuleSchema.safeParse({
        lapsedDays: 90,
        includeNoBookingDate: false,
        excludeCampaignIds: [
          '11111111-1111-4111-8111-111111111111',
          '11111111-1111-4111-8111-111111111111',
        ],
      }).success,
    ).toBe(false);
  });

  it('defaults audience preview to 90 lapsed days without missing booking dates', () => {
    expect(campaignAudiencePreviewRequestSchema.parse({})).toEqual({
      audienceRule: {
        lapsedDays: 90,
        includeNoBookingDate: false,
        excludeCampaignIds: [],
        recentCampaignExclusionDays: 30,
      },
    });
  });

  it('defaults campaign audience exclusions for older rule shapes', () => {
    expect(
      campaignAudienceRuleSchema.parse({
        lapsedDays: 90,
        includeNoBookingDate: false,
      }),
    ).toEqual({
      lapsedDays: 90,
      includeNoBookingDate: false,
      excludeCampaignIds: [],
      recentCampaignExclusionDays: 30,
    });
  });

  it('normalizes campaign audience rules for shared runtime use', () => {
    expect(
      normalizeCampaignAudienceRule({
        lapsedDays: 90,
        includeNoBookingDate: false,
      }),
    ).toEqual({
      lapsedDays: 90,
      includeNoBookingDate: false,
      excludeCampaignIds: [],
      recentCampaignExclusionDays: 30,
    });
  });

  it('requires acknowledgement when recent campaign protection is relaxed', () => {
    expect(
      requiresRecentCampaignExclusionAcknowledgement({
        lapsedDays: 90,
        includeNoBookingDate: false,
        excludeCampaignIds: [],
        recentCampaignExclusionDays: 30,
      }),
    ).toBe(false);
    expect(
      requiresRecentCampaignExclusionAcknowledgement({
        lapsedDays: 90,
        includeNoBookingDate: false,
        excludeCampaignIds: [],
        recentCampaignExclusionDays: 14,
      }),
    ).toBe(true);
    expect(
      requiresRecentCampaignExclusionAcknowledgement({
        lapsedDays: 90,
        includeNoBookingDate: false,
        excludeCampaignIds: [],
        recentCampaignExclusionDays: null,
      }),
    ).toBe(true);
  });

  it('accepts selected campaign exclusions and constrained recent send windows', () => {
    expect(
      campaignAudienceRuleSchema.parse({
        lapsedDays: 90,
        includeNoBookingDate: false,
        excludeCampaignIds: ['11111111-1111-4111-8111-111111111111'],
        recentCampaignExclusionDays: null,
      }),
    ).toEqual({
      lapsedDays: 90,
      includeNoBookingDate: false,
      excludeCampaignIds: ['11111111-1111-4111-8111-111111111111'],
      recentCampaignExclusionDays: null,
    });

    expect(
      campaignAudienceRuleSchema.parse({
        lapsedDays: 90,
        includeNoBookingDate: false,
        recentCampaignExclusionDays: 7,
      }).recentCampaignExclusionDays,
    ).toBe(7);
  });

  it('accepts audience preview responses', () => {
    expect(
      campaignAudiencePreviewResponseSchema.safeParse({
        baseEligibleCount: 18,
        eligibleCount: 12,
        suppressedCount: 2,
        incompleteCount: 3,
        missingConsentCount: 4,
        recentCampaignExcludedCount: 5,
        selectedCampaignsExcludedCount: 1,
        excludedCampaigns: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Lapsed 180d',
            excludedCount: 1,
          },
        ],
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

  it('accepts public SMS sender countries', () => {
    expect(
      smsSenderCountriesResponseSchema.parse({
        countries: [
          {
            countryCode: 'se',
            label: 'Sweden',
          },
        ],
      }),
    ).toEqual({
      countries: [
        {
          countryCode: 'SE',
          label: 'Sweden',
        },
      ],
    });

  });

  it('accepts the sender country needed for provisioning', () => {
    expect(
      provisionOrganizationSmsSenderSchema.parse({
        countryCode: 'se',
      }),
    ).toEqual({
      countryCode: 'SE',
    });
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
      campaignSendRequestSchema.parse({}),
    ).toEqual({
      recentCampaignExclusionAcknowledged: false,
    });
    expect(
      campaignSendRequestSchema.parse({
        recentCampaignExclusionAcknowledged: true,
      }),
    ).toEqual({
      recentCampaignExclusionAcknowledged: true,
    });
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
            'Hi Anna\n\nhttps://go.retaino.io/r/abc123\n\nReply STOP to opt out',
          smsLength: 70,
          estimatedSmsPerRecipient: 1,
          optOutText: 'Reply STOP to opt out',
        },
      }).success,
    ).toBe(true);

    expect(
      campaignSmsTestSendRequestSchema.parse({
        sampleContactId: '11111111-1111-4111-8111-111111111111',
        testPhone: '0700000000',
        testPhoneCountryCode: 'se',
      }),
    ).toEqual({
      sampleContactId: '11111111-1111-4111-8111-111111111111',
      testPhone: '0700000000',
      testPhoneCountryCode: 'SE',
    });

    expect(
      campaignSmsTestContactSearchResponseSchema.safeParse({
        contacts: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Ada Lovelace',
            phone: '+46700000000',
            email: 'ada@example.com',
            lastBookingAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }).success,
    ).toBe(true);

    expect(
      campaignSmsTestSendResponseSchema.safeParse({
        testSend: {
          to: '+46700000000',
          renderedBody:
            'Hi Anna\n\nhttps://go.retaino.io/r/abc123\n\nReply STOP to opt out',
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
          reportedOutcome: {
            bookingCount: 2,
            revenueAmountMinor: 320000,
            currency: 'SEK',
            hasMixedCurrencies: false,
            bookingRate: 0.25,
          },
          reportedBookings: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              campaignId: '22222222-2222-4222-8222-222222222222',
              campaignRecipientId: '55555555-5555-4555-8555-555555555555',
              contactId: '66666666-6666-4666-8666-666666666666',
              source: 'manual',
              createdByUserId: '33333333-3333-4333-8333-333333333333',
              bookingDate: '2026-05-21',
              revenueAmountMinor: 125050,
              currency: 'SEK',
              service: 'Cut and color',
              note: null,
              createdAt: '2026-05-22T10:00:00.000Z',
              contact: {
                id: '66666666-6666-4666-8666-666666666666',
                name: 'Ada Lovelace',
                phone: '+46700000000',
                email: 'ada@example.com',
              },
            },
          ],
        },
      }).success,
    ).toBe(true);
  });

  it('accepts campaign recipient search responses', () => {
    expect(
      campaignRecipientSearchResponseSchema.parse({
        recipients: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            contactId: '55555555-5555-4555-8555-555555555555',
            name: 'Ada Lovelace',
            phone: '+46700000000',
            email: 'ada@example.com',
          },
          {
            id: '22222222-2222-4222-8222-222222222222',
            contactId: '66666666-6666-4666-8666-666666666666',
            name: null,
            phone: '+46711111111',
            email: null,
          },
        ],
      }).recipients,
    ).toHaveLength(2);
  });

  it('accepts direct reported bookings with multiple rows', () => {
    expect(
      createReportedBookingsSchema.parse({
        bookings: [
          {
            bookingDate: '2026-05-21',
            campaignRecipientId: '11111111-1111-4111-8111-111111111111',
            contactId: '22222222-2222-4222-8222-222222222222',
            revenueAmount: '1250,50',
            service: 'Cut and color',
          },
          {
            bookingDate: '2026-05-22',
            campaignRecipientId: '33333333-3333-4333-8333-333333333333',
            contactId: '44444444-4444-4444-8444-444444444444',
            note: 'Called after SMS',
          },
        ],
      }),
    ).toMatchObject({
      bookings: [
        {
          bookingDate: '2026-05-21',
          campaignRecipientId: '11111111-1111-4111-8111-111111111111',
          revenueAmount: '1250,50',
        },
        {
          bookingDate: '2026-05-22',
          campaignRecipientId: '33333333-3333-4333-8333-333333333333',
        },
      ],
    });
  });

  it('rejects empty reported booking submissions and incomplete booking rows', () => {
    expect(
      createReportedBookingsSchema.safeParse({
        bookings: [],
      }).success,
    ).toBe(false);
    expect(
      createReportedBookingsSchema.safeParse({
        bookings: [
          {
            bookingDate: '2026-05-22',
            contactId: '22222222-2222-4222-8222-222222222222',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('caps reported bookings to lightweight batches', () => {
    expect(
      createReportedBookingsSchema.safeParse({
        bookings: Array.from(
          { length: MAX_REPORTED_BOOKING_ROWS + 1 },
          () => ({
            bookingDate: '2026-05-22',
            campaignRecipientId: '11111111-1111-4111-8111-111111111111',
            contactId: '22222222-2222-4222-8222-222222222222',
            service: 'Cut',
          }),
        ),
      }).success,
    ).toBe(false);
  });

  it('caps reported booking text fields', () => {
    expect(
      createReportedBookingsSchema.safeParse({
        bookings: [
          {
            bookingDate: '2026-05-22',
            campaignRecipientId: '11111111-1111-4111-8111-111111111111',
            contactId: '22222222-2222-4222-8222-222222222222',
            note: 'x'.repeat(501),
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      createReportedBookingsSchema.safeParse({
        bookings: [
          {
            bookingDate: '2026-05-22',
            campaignRecipientId: '11111111-1111-4111-8111-111111111111',
            contactId: '22222222-2222-4222-8222-222222222222',
            service: 'x'.repeat(121),
          },
        ],
      }).success,
    ).toBe(false);
  });
});
