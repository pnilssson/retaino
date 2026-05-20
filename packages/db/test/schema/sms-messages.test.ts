import { describe, expect, it } from 'vitest';
import { smsMessages } from '../../src/schema/sms-messages';

describe('sms messages schema', () => {
  it('stores the canonical outbound SMS message ledger', () => {
    expect(smsMessages.organizationId.name).toBe('organization_id');
    expect(smsMessages.direction.name).toBe('direction');
    expect(smsMessages.campaignId.name).toBe('campaign_id');
    expect(smsMessages.recipientId.name).toBe('recipient_id');
    expect(smsMessages.contactId.name).toBe('contact_id');
    expect(smsMessages.provider.name).toBe('provider');
    expect(smsMessages.providerMessageId.name).toBe('provider_message_id');
    expect(smsMessages.providerMessagingServiceId.name).toBe(
      'provider_messaging_service_id',
    );
    expect(smsMessages.providerPhoneNumberId.name).toBe(
      'provider_phone_number_id',
    );
    expect(smsMessages.fromPhone.name).toBe('from_phone');
    expect(smsMessages.toPhone.name).toBe('to_phone');
    expect(smsMessages.body.name).toBe('body');
    expect(smsMessages.status.name).toBe('status');
    expect(smsMessages.estimatedSegmentCount.name).toBe(
      'estimated_segment_count',
    );
    expect(smsMessages.actualSegmentCount.name).toBe('actual_segment_count');
    expect(smsMessages.estimatedCostMinor.name).toBe('estimated_cost_minor');
    expect(smsMessages.actualCostMinor.name).toBe('actual_cost_minor');
    expect(smsMessages.currency.name).toBe('currency');
    expect(smsMessages.queuedAt.name).toBe('queued_at');
    expect(smsMessages.sentAt.name).toBe('sent_at');
    expect(smsMessages.deliveredAt.name).toBe('delivered_at');
    expect(smsMessages.failedAt.name).toBe('failed_at');
  });
});
