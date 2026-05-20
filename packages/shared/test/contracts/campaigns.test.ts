import { describe, expect, it } from 'vitest';
import {
  campaignAudiencePreviewRequestSchema,
  campaignAudiencePreviewResponseSchema,
  campaignAudienceRuleSchema,
  campaignMessageEventSchema,
  campaignReportResponseSchema,
  campaignRecipientListResponseSchema,
  campaignRecipientSummaryResponseSchema,
  campaignRecipientSchema,
  campaignSendResponseSchema,
  campaignSmsPreviewResponseSchema,
  campaignSmsTestSendRequestSchema,
  campaignSmsTestSendResponseSchema,
  campaignSchema,
  clickEventSchema,
  createCampaignDraftSchema,
  organizationSmsSenderResponseSchema,
  provisionOrganizationSmsSenderSchema,
  smsMessageSchema,
  smsSenderCountriesResponseSchema,
  smsSenderNumbersRequestSchema,
  trackingLinkSchema,
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

  it('accepts provider-neutral SMS sender countries and number choices', () => {
    expect(
      smsSenderCountriesResponseSchema.parse({
        countries: [
          {
            countryCode: 'se',
            label: 'Sweden',
            supportedNumberTypes: ['mobile'],
            selfServeAvailable: true,
          },
        ],
      }),
    ).toEqual({
      countries: [
        {
          countryCode: 'SE',
          label: 'Sweden',
          supportedNumberTypes: ['mobile'],
          selfServeAvailable: true,
        },
      ],
    });

    expect(
      smsSenderNumbersRequestSchema.parse({
        countryCode: 'us',
        numberType: 'toll_free',
      }),
    ).toEqual({
      countryCode: 'US',
      numberType: 'toll_free',
    });
  });

  it('accepts the selected sender needed for provisioning', () => {
    expect(
      provisionOrganizationSmsSenderSchema.safeParse({
        selectedSender: {
          phoneNumber: '+46700000000',
          countryCode: 'SE',
          numberType: 'mobile',
          capabilities: {
            outboundSms: true,
            inboundSms: true,
            statusCallbacks: true,
            twoWaySms: true,
            smartEncoding: false,
          },
          regulatoryRequirementSummary: null,
          label: '+46 70 000 00 00',
        },
      }).success,
    ).toBe(true);
  });

  it('accepts launch and recipient snapshot contracts', () => {
    const recipient = {
      id: '44444444-4444-4444-8444-444444444444',
      organizationId: '22222222-2222-4222-8222-222222222222',
      campaignId: '55555555-5555-4555-8555-555555555555',
      contactId: null,
      status: 'selected',
      exclusionReason: null,
      name: 'Ada Lovelace',
      phone: '+46700000000',
      email: 'ada@example.com',
      lastBookingAt: '2026-01-01T00:00:00.000Z',
      lastContactedAt: null,
      selectedAt: '2026-05-16T10:00:00.000Z',
      queuedAt: null,
      sentAt: null,
      failedAt: null,
      createdAt: '2026-05-16T10:00:00.000Z',
      updatedAt: '2026-05-16T10:00:00.000Z',
    };

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

    expect(campaignRecipientSchema.safeParse(recipient).success).toBe(true);
    expect(
      campaignRecipientListResponseSchema.safeParse({
        recipients: [recipient],
      }).success,
    ).toBe(true);
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

  it('accepts tracking link and SMS message contracts', () => {
    expect(
      trackingLinkSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        campaignId: '33333333-3333-4333-8333-333333333333',
        recipientId: '44444444-4444-4444-8444-444444444444',
        code: 'abc123',
        targetUrl: 'https://booking.example.com/studio',
        phoneHash: 'p'.repeat(64),
        emailHash: null,
        firstClickedAt: null,
        lastClickedAt: null,
        clickCount: 0,
        createdAt: '2026-05-16T10:00:00.000Z',
        updatedAt: '2026-05-16T10:00:00.000Z',
      }).success,
    ).toBe(true);

    expect(
      smsMessageSchema.safeParse({
        id: '55555555-5555-4555-8555-555555555555',
        organizationId: '22222222-2222-4222-8222-222222222222',
        direction: 'outbound',
        campaignId: '33333333-3333-4333-8333-333333333333',
        recipientId: '44444444-4444-4444-8444-444444444444',
        contactId: '66666666-6666-4666-8666-666666666666',
        provider: 'fake',
        providerMessageId: 'fake-message-1',
        providerMessagingServiceId: 'fake-ms-1',
        providerPhoneNumberId: 'fake-pn-1',
        fromPhone: '+46700000000',
        toPhone: '+46701111111',
        body: 'Hi Anna',
        status: 'queued',
        estimatedSegmentCount: 1,
        actualSegmentCount: 1,
        estimatedCostMinor: null,
        actualCostMinor: null,
        currency: 'SEK',
        queuedAt: '2026-05-16T10:00:00.000Z',
        sentAt: null,
        receivedAt: null,
        deliveredAt: null,
        failedAt: null,
        createdAt: '2026-05-16T10:00:00.000Z',
        updatedAt: '2026-05-16T10:00:00.000Z',
      }).success,
    ).toBe(true);

    expect(
      campaignMessageEventSchema.safeParse({
        id: '77777777-7777-4777-8777-777777777777',
        organizationId: '22222222-2222-4222-8222-222222222222',
        campaignId: '33333333-3333-4333-8333-333333333333',
        messageId: '55555555-5555-4555-8555-555555555555',
        recipientId: '44444444-4444-4444-8444-444444444444',
        provider: 'fake',
        providerMessageId: 'fake-message-1',
        eventType: 'delivered',
        rawStatus: 'delivered',
        occurredAt: '2026-05-16T10:01:00.000Z',
        createdAt: '2026-05-16T10:01:00.000Z',
      }).success,
    ).toBe(true);

    expect(
      clickEventSchema.safeParse({
        id: '88888888-8888-4888-8888-888888888888',
        organizationId: '22222222-2222-4222-8222-222222222222',
        campaignId: '33333333-3333-4333-8333-333333333333',
        recipientId: '44444444-4444-4444-8444-444444444444',
        trackingLinkId: '11111111-1111-4111-8111-111111111111',
        userAgent: 'Mozilla/5.0',
        occurredAt: '2026-05-16T10:02:00.000Z',
        createdAt: '2026-05-16T10:02:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('keeps provider sender IDs out of public sender response contracts', () => {
    const response = organizationSmsSenderResponseSchema.parse({
      sender: {
        id: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        provider: 'fake',
        status: 'ready',
        phoneNumber: '+46700000000',
        countryCode: 'SE',
        numberType: 'mobile',
        regulatoryStatus: 'not_required',
        failureReason: null,
        provisionedAt: '2026-05-18T00:00:00.000Z',
        lastVerifiedAt: '2026-05-18T00:00:00.000Z',
        createdAt: '2026-05-18T00:00:00.000Z',
        updatedAt: '2026-05-18T00:00:00.000Z',
      },
    });

    expect(response.sender).not.toHaveProperty('providerMessagingServiceId');
    expect(response.sender).not.toHaveProperty('providerPhoneNumberId');
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
          estimatedCostMinor: null,
          actualCostMinor: null,
          currency: 'SEK',
        },
      }).success,
    ).toBe(true);
  });
});
