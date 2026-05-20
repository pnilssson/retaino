import { describe, expect, it } from 'vitest';
import { trackingLinks } from '../../src/schema/tracking-links';

describe('tracking links schema', () => {
  it('stores one short link per campaign recipient', () => {
    expect(trackingLinks.organizationId.name).toBe('organization_id');
    expect(trackingLinks.campaignId.name).toBe('campaign_id');
    expect(trackingLinks.recipientId.name).toBe('recipient_id');
    expect(trackingLinks.code.name).toBe('code');
    expect(trackingLinks.targetUrl.name).toBe('target_url');
    expect(trackingLinks.phoneHash.name).toBe('phone_hash');
    expect(trackingLinks.emailHash.name).toBe('email_hash');
    expect(trackingLinks.firstClickedAt.name).toBe('first_clicked_at');
    expect(trackingLinks.lastClickedAt.name).toBe('last_clicked_at');
    expect(trackingLinks.clickCount.name).toBe('click_count');
  });
});
