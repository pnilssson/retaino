import { describe, expect, it } from 'vitest';
import { campaigns } from '../../src/schema/campaigns';

describe('campaigns schema', () => {
  it('keeps campaigns organization scoped', () => {
    expect(campaigns.organizationId.name).toBe('organization_id');
  });

  it('stores only draft foundation fields in phase 1', () => {
    expect(campaigns.createdByUserId.name).toBe('created_by_user_id');
    expect(campaigns.audienceRule.name).toBe('audience_rule');
    expect(campaigns.smsBody.name).toBe('sms_body');
    expect(campaigns.bookingUrl.name).toBe('booking_url');
    expect(campaigns.campaignCode.name).toBe('campaign_code');
    expect(campaigns.attributionWindowDays.name).toBe(
      'attribution_window_days',
    );
    expect('approvedAt' in campaigns).toBe(false);
    expect('sendStartedAt' in campaigns).toBe(false);
    expect('providerMessageId' in campaigns).toBe(false);
  });
});
