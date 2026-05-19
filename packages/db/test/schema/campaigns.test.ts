import { describe, expect, it } from 'vitest';
import {
  auditLogs,
  campaignRecipients,
  campaigns,
} from '../../src/schema/campaigns';

describe('campaigns schema', () => {
  it('keeps campaigns organization scoped', () => {
    expect(campaigns.organizationId.name).toBe('organization_id');
  });

  it('stores launch readiness fields on campaigns', () => {
    expect(campaigns.createdByUserId.name).toBe('created_by_user_id');
    expect(campaigns.audienceRule.name).toBe('audience_rule');
    expect(campaigns.smsBody.name).toBe('sms_body');
    expect(campaigns.bookingUrl.name).toBe('booking_url');
    expect(campaigns.campaignCode.name).toBe('campaign_code');
    expect(campaigns.attributionWindowDays.name).toBe(
      'attribution_window_days',
    );
    expect(campaigns.readyToSendAt.name).toBe('ready_to_send_at');
    expect(campaigns.readyToSendByUserId.name).toBe(
      'ready_to_send_by_user_id',
    );
    expect('sendStartedAt' in campaigns).toBe(false);
    expect('providerMessageId' in campaigns).toBe(false);
  });

  it('stores campaign recipient snapshots for reporting', () => {
    expect(campaignRecipients.organizationId.name).toBe('organization_id');
    expect(campaignRecipients.campaignId.name).toBe('campaign_id');
    expect(campaignRecipients.contactId.name).toBe('contact_id');
    expect(campaignRecipients.contactId.notNull).toBe(false);
    expect(campaignRecipients.status.name).toBe('status');
    expect(campaignRecipients.exclusionReason.name).toBe('exclusion_reason');
    expect(campaignRecipients.name.name).toBe('name');
    expect(campaignRecipients.phone.name).toBe('phone');
    expect(campaignRecipients.email.name).toBe('email');
    expect(campaignRecipients.normalizedPhone.name).toBe('normalized_phone');
    expect(campaignRecipients.normalizedEmail.name).toBe('normalized_email');
    expect(campaignRecipients.phoneHash.name).toBe('phone_hash');
    expect(campaignRecipients.emailHash.name).toBe('email_hash');
    expect(campaignRecipients.lastBookingAt.name).toBe('last_booking_at');
    expect(campaignRecipients.lastContactedAt.name).toBe('last_contacted_at');
    expect(campaignRecipients.selectedAt.name).toBe('selected_at');
    expect(campaignRecipients.queuedAt.name).toBe('queued_at');
    expect(campaignRecipients.sentAt.name).toBe('sent_at');
    expect(campaignRecipients.failedAt.name).toBe('failed_at');
  });

  it('stores tenant-scoped audit logs for launch decisions', () => {
    expect(auditLogs.organizationId.name).toBe('organization_id');
    expect(auditLogs.actorUserId.name).toBe('actor_user_id');
    expect(auditLogs.eventType.name).toBe('event_type');
    expect(auditLogs.resourceType.name).toBe('resource_type');
    expect(auditLogs.resourceId.name).toBe('resource_id');
    expect(auditLogs.metadata.name).toBe('metadata');
    expect(auditLogs.ipAddress.name).toBe('ip_address');
    expect(auditLogs.userAgent.name).toBe('user_agent');
  });
});
