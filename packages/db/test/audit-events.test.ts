import { describe, expect, it } from 'vitest';
import { auditEvents } from '../src/audit-events';

const organizationId = '22222222-2222-4222-8222-222222222222';
const actorUserId = '33333333-3333-4333-8333-333333333333';

describe('audit event factories', () => {
  it('builds contact import start metadata from the upload decision', () => {
    expect(
      auditEvents.contactImportStarted({
        organizationId,
        actorUserId,
        contactImportId: '44444444-4444-4444-8444-444444444444',
        fileName: 'contacts.csv',
        fileSize: 1024,
        mapping: { name: 'Name', phone: 'Phone' },
        phoneCountryCode: 'SE',
        permissionAttestedAt: new Date('2026-05-29T10:00:00.000Z'),
        userAgent: 'vitest',
      }),
    ).toEqual({
      organizationId,
      actorUserId,
      eventType: 'contact_import.started',
      resourceType: 'contact_import',
      resourceId: '44444444-4444-4444-8444-444444444444',
      metadata: {
        fileName: 'contacts.csv',
        fileSize: 1024,
        mapping: { name: 'Name', phone: 'Phone' },
        phoneCountryCode: 'SE',
        permissionAttestedAt: '2026-05-29T10:00:00.000Z',
      },
      userAgent: 'vitest',
    });
  });

  it('builds campaign launch evidence without call-site metadata choices', () => {
    expect(
      auditEvents.campaignReadyToSend({
        organizationId,
        actorUserId,
        campaignId: '55555555-5555-4555-8555-555555555555',
        audienceRule: {
          minDaysSinceLastBooking: 30,
          maxDaysSinceLastBooking: null,
          excludeMissingLastBooking: true,
          excludeWithoutConsent: true,
          excludeSuppressed: true,
          recentCampaignExclusionDays: 7,
          excludeCampaignIds: [],
        },
        smsBody: 'Hi {first_name}',
        bookingUrl: 'https://booking.example.com',
        campaignCode: 'SPRING',
        attributionWindowDays: 14,
        recipientCount: 12,
        recentCampaignExclusionAcknowledged: true,
      }),
    ).toMatchObject({
      eventType: 'campaign.ready_to_send',
      resourceType: 'campaign',
      resourceId: '55555555-5555-4555-8555-555555555555',
      metadata: {
        smsBody: 'Hi {first_name}',
        bookingUrl: 'https://booking.example.com',
        campaignCode: 'SPRING',
        attributionWindowDays: 14,
        recipientCount: 12,
        recentCampaignExclusionAcknowledged: true,
      },
      userAgent: null,
    });
  });

  it('builds destructive contact audit events as one row per request', () => {
    expect(
      auditEvents.contactsDeleted({
        organizationId,
        actorUserId,
        mode: 'bulk',
        requestedContactIds: [
          '66666666-6666-4666-8666-666666666666',
          '77777777-7777-4777-8777-777777777777',
        ],
        deletedContactIds: ['66666666-6666-4666-8666-666666666666'],
      }),
    ).toMatchObject({
      eventType: 'contacts.deleted',
      resourceType: 'organization',
      resourceId: organizationId,
      metadata: {
        mode: 'bulk',
        deletedCount: 1,
        requestedContactIds: [
          '66666666-6666-4666-8666-666666666666',
          '77777777-7777-4777-8777-777777777777',
        ],
        deletedContactIds: ['66666666-6666-4666-8666-666666666666'],
      },
    });
  });

  it('builds manual contact creation audit evidence', () => {
    expect(
      auditEvents.contactCreated({
        organizationId,
        actorUserId,
        contactId: '66666666-6666-4666-8666-666666666666',
        marketingSmsAllowed: false,
        suppressionCreated: true,
        userAgent: 'vitest',
      }),
    ).toEqual({
      organizationId,
      actorUserId,
      eventType: 'contact.created',
      resourceType: 'contact',
      resourceId: '66666666-6666-4666-8666-666666666666',
      metadata: {
        marketingSmsAllowed: false,
        suppressionCreated: true,
      },
      userAgent: 'vitest',
    });
  });
});
