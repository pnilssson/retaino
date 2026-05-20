import { describe, expect, it } from 'vitest';
import { clickEvents } from '../../src/schema/click-events';

describe('click events schema', () => {
  it('stores tenant-scoped tracking link click events', () => {
    expect(clickEvents.organizationId.name).toBe('organization_id');
    expect(clickEvents.campaignId.name).toBe('campaign_id');
    expect(clickEvents.recipientId.name).toBe('recipient_id');
    expect(clickEvents.trackingLinkId.name).toBe('tracking_link_id');
    expect(clickEvents.userAgent.name).toBe('user_agent');
    expect(clickEvents.ipAddress.name).toBe('ip_address');
    expect(clickEvents.occurredAt.name).toBe('occurred_at');
  });
});
