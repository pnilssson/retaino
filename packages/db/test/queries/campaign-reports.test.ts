import { type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { getCampaignReport } from '../../src/queries/campaign-reports';
import { campaignRow } from './campaign-fixtures';

describe('campaign report query helpers', () => {
  it('builds tenant-scoped campaign report aggregate queries', async () => {
    let statement: SQL | undefined;
    const db = {
      execute: (query: SQL) => {
        statement = query;

        return {
          rows: [
            {
              selected_count: 10,
              queued_count: 0,
              sent_count: 9,
              delivered_count: 8,
              failed_count: 1,
              skipped_count: 1,
              opt_out_count: 1,
              inbound_reply_count: 2,
              click_count: 4,
              unique_clicker_count: 3,
              estimated_sms_segments: 10,
              actual_sms_segments: 9,
              manual_booking_count: 2,
              manual_revenue_amount_minor: 320000,
              manual_revenue_currency: 'SEK',
              manual_has_mixed_currencies: false,
            },
          ],
        };
      },
    };

    await expect(
      getCampaignReport(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
      }),
    ).resolves.toMatchObject({
      selectedCount: 10,
      deliveredCount: 8,
      segmentEstimateDrift: -1,
      manualOutcome: {
        bookingCount: 2,
        revenueAmountMinor: 320000,
        currency: 'SEK',
        hasMixedCurrencies: false,
        bookingRate: 0.25,
        revenuePerDeliveredRecipientMinor: 40000,
      },
    });

    if (!statement) {
      throw new Error('Expected getCampaignReport to execute a SQL statement.');
    }

    const query = new PgDialect().sqlToQuery(statement);
    expect(query.sql).toContain('$1::uuid as campaign_id');
    expect(query.sql).toContain('$2::uuid as organization_id');
    expect(query.sql).toContain('"campaign_recipients"."organization_id"');
    expect(query.sql).toContain('"sms_messages"."organization_id"');
    expect(query.sql).toContain('"click_events"."organization_id"');
    expect(query.sql).toContain('"reported_bookings"."organization_id"');
    expect(query.sql).toContain('count(distinct');
    expect(query.params.slice(0, 2)).toEqual([
      campaignRow.id,
      campaignRow.organizationId,
    ]);
  });

  it('does not expose a single revenue total for mixed currencies', async () => {
    const db = {
      execute: () => ({
        rows: [
          {
            selected_count: 10,
            queued_count: 0,
            sent_count: 9,
            delivered_count: 8,
            failed_count: 1,
            skipped_count: 1,
            opt_out_count: 0,
            inbound_reply_count: 0,
            click_count: 0,
            unique_clicker_count: 0,
            estimated_sms_segments: 10,
            actual_sms_segments: 9,
            manual_booking_count: 2,
            manual_revenue_amount_minor: null,
            manual_revenue_currency: 'SEK',
            manual_has_mixed_currencies: true,
            booking_reports: [
              {
                id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                campaignId: campaignRow.id,
                source: 'manual',
                status: 'completed',
                checkedThroughDate: null,
                note: null,
                bookingCount: 2,
                revenueAmountMinor: null,
                currency: 'SEK',
                hasMixedCurrencies: true,
                createdByUserId: campaignRow.createdByUserId,
                createdAt: new Date('2026-05-22T10:00:00.000Z'),
              },
            ],
          },
        ],
      }),
    };

    await expect(
      getCampaignReport(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
      }),
    ).resolves.toMatchObject({
      manualOutcome: {
        revenueAmountMinor: null,
        currency: 'SEK',
        hasMixedCurrencies: true,
        revenuePerDeliveredRecipientMinor: null,
      },
      bookingReports: [
        {
          revenueAmountMinor: null,
          hasMixedCurrencies: true,
        },
      ],
    });
  });
});
