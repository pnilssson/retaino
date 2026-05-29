import { describe, expect, it } from 'vitest';
import { overviewResponseSchema } from '../../src/contracts';

describe('overview contracts', () => {
  it('accepts the focused workspace overview response', () => {
    expect(
      overviewResponseSchema.safeParse({
        window: {
          startDate: '2026-05-01',
          endDate: '2026-05-30',
          days: 30,
        },
        metrics: {
          reportedRevenueAmountMinor: 125000,
          reportedRevenueCurrency: 'SEK',
          reportedRevenueHasMixedCurrencies: false,
          reportedBookingCount: 4,
          needsReplyCount: 2,
          smsCreditBalance: 180,
        },
        trend: [
          {
            date: '2026-05-29',
            deliveredSmsCount: 92,
            reportedBookingCount: 2,
            reportedRevenueAmountMinor: 75000,
          },
        ],
        funnel: {
          selectedCount: 120,
          sentCount: 100,
          deliveredCount: 92,
          inboundReplyCount: 11,
          reportedBookingCount: 4,
        },
        recentCampaigns: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'May reactivation',
            status: 'sent',
            sentAt: '2026-05-29T10:00:00.000Z',
            deliveredCount: 92,
            inboundReplyCount: 11,
            optOutCount: 3,
            reportedBookingCount: 4,
            reportedRevenueAmountMinor: 125000,
            reportedRevenueCurrency: 'SEK',
            reportedRevenueHasMixedCurrencies: false,
            nextAction: 'review_report',
          },
        ],
        attentionItems: [
          {
            id: 'needs-reply',
            tone: 'warning',
            title: '2 conversations need a reply',
            description: 'Answer recent replies before the customer moves on.',
            action: 'open_inbox',
          },
        ],
      }).success,
    ).toBe(true);
  });
});
