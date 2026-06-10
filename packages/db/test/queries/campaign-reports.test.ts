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
              reported_booking_count: 2,
              reported_revenue_amount_minor: 320000,
              reported_revenue_currency: 'SEK',
              reported_has_mixed_currencies: false,
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
      reportedOutcome: {
        bookingCount: 2,
        revenueAmountMinor: 320000,
        currency: 'SEK',
        hasMixedCurrencies: false,
        bookingRate: 0.25,
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
    expect(query.sql).toContain(
      'coalesce(actual_segment_count, estimated_segment_count, 0)',
    );
    expect(query.sql).toContain(
      'count(distinct "sms_messages"."recipient_id") filter',
    );
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
            reported_booking_count: 2,
            reported_revenue_amount_minor: null,
            reported_revenue_currency: 'SEK',
            reported_has_mixed_currencies: true,
            reported_bookings: [
              {
                id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                campaignId: campaignRow.id,
                campaignRecipientId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
                contactId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                source: 'manual',
                revenueAmountMinor: null,
                currency: 'SEK',
                createdByUserId: campaignRow.createdByUserId,
                bookingDate: '2026-05-21',
                service: 'Cut and color',
                note: null,
                createdAt: new Date('2026-05-22T10:00:00.000Z'),
                contact: {
                  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                  name: 'Ada Lovelace',
                  phone: '+46700000000',
                  email: 'ada@example.com',
                },
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
      reportedOutcome: {
        revenueAmountMinor: null,
        currency: 'SEK',
        hasMixedCurrencies: true,
      },
      reportedBookings: [
        {
          revenueAmountMinor: null,
          contact: {
            name: 'Ada Lovelace',
          },
          service: 'Cut and color',
        },
      ],
    });
  });
});
