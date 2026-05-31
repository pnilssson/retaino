import { type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { getOverviewDashboard } from '../../src/queries/overview';

const organizationId = '22222222-2222-4222-8222-222222222222';

describe('overview query helpers', () => {
  it('builds tenant-scoped overview aggregates for the focused dashboard', async () => {
    let statement: SQL | undefined;
    const db = {
      execute: (query: SQL) => {
        statement = query;

        return {
          rows: [
            {
              reported_booking_count: 4,
              reported_revenue_amount_minor: 125000,
              reported_revenue_currency: 'SEK',
              reported_revenue_has_mixed_currencies: false,
              needs_reply_count: 2,
              sms_credit_balance: 180,
              sender_phone_number: '+46701234567',
              sender_status: 'ready',
              sender_country_code: 'SE',
              release_scheduled_at: null,
              selected_count: 120,
              sent_count: 100,
              delivered_count: 92,
              inbound_reply_count: 11,
              trend: [
                {
                  date: '2026-05-29',
                  deliveredSmsCount: 40,
                  reportedBookingCount: 2,
                  reportedRevenueAmountMinor: 75000,
                },
              ],
              recent_campaigns: [
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
                },
              ],
            },
          ],
        };
      },
    };

    await expect(
      getOverviewDashboard(db as never, {
        organizationId,
        now: new Date('2026-05-30T12:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      window: {
        startDate: '2026-05-01',
        endDate: '2026-05-30',
        days: 30,
      },
      metrics: {
        reportedRevenueAmountMinor: 125000,
        reportedRevenueCurrency: 'SEK',
        reportedBookingCount: 4,
        needsReplyCount: 2,
        smsCreditBalance: 180,
      },
      sender: {
        phoneNumber: '+46701234567',
        status: 'ready',
        countryCode: 'SE',
        releaseScheduledAt: null,
      },
      funnel: {
        selectedCount: 120,
        sentCount: 100,
        deliveredCount: 92,
        inboundReplyCount: 11,
        reportedBookingCount: 4,
      },
      trend: [
        {
          deliveredSmsCount: 40,
        },
      ],
      recentCampaigns: [
        {
          name: 'May reactivation',
          nextAction: 'review_report',
        },
      ],
    });

    if (!statement) {
      throw new Error('Expected getOverviewDashboard to execute SQL.');
    }

    const query = new PgDialect().sqlToQuery(statement);
    expect(query.sql).toContain('$1::uuid as organization_id');
    expect(query.sql).toContain('"reported_bookings"."organization_id"');
    expect(query.sql).toContain('"sms_conversations"."organization_id"');
    expect(query.sql).toContain('"sms_credit_transactions"."organization_id"');
    expect(query.sql).toContain('"sms_messages"."campaign_id" is not null');
    expect(query.sql).toContain('"campaigns"."organization_id"');
    expect(query.params[0]).toBe(organizationId);
  });

  it('does not sum overview revenue when reported bookings use mixed currencies', async () => {
    const db = {
      execute: () => ({
        rows: [
          {
            reported_booking_count: 2,
            reported_revenue_amount_minor: null,
            reported_revenue_currency: 'SEK',
            reported_revenue_has_mixed_currencies: true,
            needs_reply_count: 0,
            sms_credit_balance: 12,
            selected_count: 20,
            sent_count: 20,
            delivered_count: 18,
            inbound_reply_count: 2,
            trend: [
              {
                date: '2026-05-29',
                deliveredSmsCount: 18,
                reportedBookingCount: 2,
                reportedRevenueAmountMinor: null,
              },
            ],
            recent_campaigns: [],
          },
        ],
      }),
    };

    await expect(
      getOverviewDashboard(db as never, {
        organizationId,
        now: new Date('2026-05-30T12:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      metrics: {
        reportedRevenueAmountMinor: null,
        reportedRevenueHasMixedCurrencies: true,
      },
      trend: [
        {
          deliveredSmsCount: 18,
          reportedRevenueAmountMinor: null,
        },
      ],
    });
  });
});
