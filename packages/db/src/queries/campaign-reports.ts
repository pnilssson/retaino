import { sql } from 'drizzle-orm';
import type { CampaignReport } from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import {
  bookingReports,
  campaignMessageEvents,
  campaignRecipients,
  clickEvents,
  organizationProfiles,
  reportedBookings,
  smsMessages,
} from '../schema';
import { assertOrganizationId } from './contacts';

export async function getCampaignReport(
  db: DbClient,
  input: { organizationId: string; campaignId: string },
): Promise<CampaignReport> {
  assertOrganizationId(input.organizationId);
  const result = await db.execute(sql`
    with input as (
      select
        ${input.campaignId}::uuid as campaign_id,
        ${input.organizationId}::uuid as organization_id
    ),
    recipient_counts as (
      select
        count(*)::integer as selected_count,
        count(*) filter (where status = ${'queued'})::integer as queued_count,
        count(*) filter (where status = ${'sent'})::integer as sent_count,
        count(*) filter (where status = ${'failed'})::integer as failed_count,
        count(*) filter (where status = ${'skipped'})::integer as skipped_count
      from ${campaignRecipients}, input
      where ${campaignRecipients.campaignId} = input.campaign_id
        and ${campaignRecipients.organizationId} = input.organization_id
    ),
    message_counts as (
      select
        count(*) filter (where direction = ${'outbound'})::integer as sent_count,
        count(*) filter (
          where direction = ${'outbound'} and status in (${'queued'}, ${'accepted'})
        )::integer as queued_count,
        count(*) filter (
          where direction = ${'outbound'} and status = ${'delivered'}
        )::integer as delivered_count,
        count(*) filter (
          where direction = ${'outbound'} and status in (${'failed'}, ${'undelivered'})
        )::integer as failed_count,
        count(*) filter (where direction = ${'inbound'})::integer
          as inbound_reply_count,
        coalesce(sum(estimated_segment_count) filter (
          where direction = ${'outbound'}
        ), 0)::integer as estimated_sms_segments,
        coalesce(sum(coalesce(actual_segment_count, 0)) filter (
          where direction = ${'outbound'}
        ), 0)::integer as actual_sms_segments
      from ${smsMessages}, input
      where ${smsMessages.campaignId} = input.campaign_id
        and ${smsMessages.organizationId} = input.organization_id
    ),
    event_counts as (
      select count(*) filter (where event_type = ${'opt_out'})::integer
        as opt_out_count
      from ${campaignMessageEvents}, input
      where ${campaignMessageEvents.campaignId} = input.campaign_id
        and ${campaignMessageEvents.organizationId} = input.organization_id
    ),
    click_counts as (
      select
        count(*)::integer as click_count,
        count(distinct ${clickEvents.recipientId})::integer as unique_clicker_count
      from ${clickEvents}, input
      where ${clickEvents.campaignId} = input.campaign_id
        and ${clickEvents.organizationId} = input.organization_id
    ),
    organization_profile as (
      select ${organizationProfiles.currency} as currency
      from ${organizationProfiles}, input
      where ${organizationProfiles.organizationId} = input.organization_id
      limit 1
    ),
    manual_outcome as (
      select
        count(${reportedBookings.id})::integer as manual_booking_count,
        case
          when count(distinct ${reportedBookings.currency}) filter (
            where ${reportedBookings.revenueAmountMinor} is not null
          ) > 1 then null
          else coalesce(sum(${reportedBookings.revenueAmountMinor}), 0)::bigint
        end as manual_revenue_amount_minor,
        coalesce(
          max(${reportedBookings.currency}) filter (
            where ${reportedBookings.revenueAmountMinor} is not null
          ),
          max(${reportedBookings.currency}),
          (select currency from organization_profile),
          ${'SEK'}
        ) as manual_revenue_currency,
        (
          count(distinct ${reportedBookings.currency}) filter (
            where ${reportedBookings.revenueAmountMinor} is not null
          ) > 1
        ) as manual_has_mixed_currencies
      from ${bookingReports}
      left join ${reportedBookings}
        on ${reportedBookings.bookingReportId} = ${bookingReports.id}
        and ${reportedBookings.organizationId} = ${bookingReports.organizationId}
      join input
        on ${bookingReports.campaignId} = input.campaign_id
        and ${bookingReports.organizationId} = input.organization_id
    ),
    booking_report_rows as (
      select
        ${bookingReports.id},
        ${bookingReports.campaignId},
        ${bookingReports.source},
        ${bookingReports.status},
        ${bookingReports.checkedThroughDate},
        ${bookingReports.note},
        count(${reportedBookings.id})::integer as booking_count,
        case
          when count(distinct ${reportedBookings.currency}) filter (
            where ${reportedBookings.revenueAmountMinor} is not null
          ) > 1 then null
          else coalesce(sum(${reportedBookings.revenueAmountMinor}), 0)::bigint
        end as revenue_amount_minor,
        coalesce(
          max(${reportedBookings.currency}) filter (
            where ${reportedBookings.revenueAmountMinor} is not null
          ),
          max(${reportedBookings.currency}),
          (select currency from organization_profile),
          ${'SEK'}
        ) as currency,
        (
          count(distinct ${reportedBookings.currency}) filter (
            where ${reportedBookings.revenueAmountMinor} is not null
          ) > 1
        ) as has_mixed_currencies,
        ${bookingReports.createdByUserId},
        ${bookingReports.createdAt}
      from ${bookingReports}
      left join ${reportedBookings}
        on ${reportedBookings.bookingReportId} = ${bookingReports.id}
        and ${reportedBookings.organizationId} = ${bookingReports.organizationId}
      join input
        on ${bookingReports.campaignId} = input.campaign_id
        and ${bookingReports.organizationId} = input.organization_id
      group by
        ${bookingReports.id},
        ${bookingReports.campaignId},
        ${bookingReports.source},
        ${bookingReports.status},
        ${bookingReports.checkedThroughDate},
        ${bookingReports.note},
        ${bookingReports.createdByUserId},
        ${bookingReports.createdAt}
      order by ${bookingReports.createdAt} desc
      limit 10
    ),
    booking_report_summaries as (
      select coalesce(
        json_agg(
          json_build_object(
            'id', booking_report_rows.id,
            'campaignId', booking_report_rows.campaign_id,
            'source', booking_report_rows.source,
            'status', booking_report_rows.status,
            'checkedThroughDate', booking_report_rows.checked_through_date,
            'note', booking_report_rows.note,
            'bookingCount', booking_report_rows.booking_count,
            'revenueAmountMinor', booking_report_rows.revenue_amount_minor,
            'currency', booking_report_rows.currency,
            'hasMixedCurrencies', booking_report_rows.has_mixed_currencies,
            'createdByUserId', booking_report_rows.created_by_user_id,
            'createdAt', booking_report_rows.created_at
          )
          order by booking_report_rows.created_at desc
        ),
        '[]'::json
      ) as booking_reports
      from booking_report_rows
    )
    select
      recipient_counts.selected_count,
      message_counts.queued_count,
      message_counts.sent_count,
      message_counts.delivered_count,
      message_counts.failed_count,
      recipient_counts.skipped_count,
      event_counts.opt_out_count,
      message_counts.inbound_reply_count,
      click_counts.click_count,
      click_counts.unique_clicker_count,
      message_counts.estimated_sms_segments,
      message_counts.actual_sms_segments,
      manual_outcome.manual_booking_count,
      manual_outcome.manual_revenue_amount_minor,
      manual_outcome.manual_revenue_currency,
      manual_outcome.manual_has_mixed_currencies,
      booking_report_summaries.booking_reports
    from recipient_counts, message_counts, event_counts, click_counts,
      manual_outcome, booking_report_summaries
  `);
  const [row = {}] = Array.from(result.rows ?? []) as Array<
    Record<string, unknown>
  >;
  const report = {
    selectedCount: intValue(row.selected_count),
    queuedCount: intValue(row.queued_count),
    sentCount: intValue(row.sent_count),
    deliveredCount: intValue(row.delivered_count),
    failedCount: intValue(row.failed_count),
    skippedCount: intValue(row.skipped_count),
    optOutCount: intValue(row.opt_out_count),
    inboundReplyCount: intValue(row.inbound_reply_count),
    clickCount: intValue(row.click_count),
    uniqueClickerCount: intValue(row.unique_clicker_count),
    estimatedSmsSegments: intValue(row.estimated_sms_segments),
    actualSmsSegments: intValue(row.actual_sms_segments),
    segmentEstimateDrift:
      intValue(row.actual_sms_segments) - intValue(row.estimated_sms_segments),
    manualOutcome: {
      bookingCount: intValue(row.manual_booking_count),
      revenueAmountMinor: nullableIntValue(row.manual_revenue_amount_minor),
      currency: stringValue(row.manual_revenue_currency) ?? 'SEK',
      hasMixedCurrencies: booleanValue(row.manual_has_mixed_currencies),
      bookingRate:
        intValue(row.delivered_count) > 0
          ? intValue(row.manual_booking_count) / intValue(row.delivered_count)
          : 0,
      revenuePerDeliveredRecipientMinor:
        intValue(row.delivered_count) > 0 &&
        row.manual_revenue_amount_minor !== null
          ? Math.round(
              intValue(row.manual_revenue_amount_minor) /
                intValue(row.delivered_count),
            )
          : null,
    },
    bookingReports: bookingReportsValue(row.booking_reports),
  };

  return report;
}

function bookingReportsValue(value: unknown): CampaignReport['bookingReports'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((row) => {
    const report = row as Record<string, unknown>;

    return {
      id: stringValue(report.id) ?? '',
      campaignId: stringValue(report.campaignId) ?? '',
      source: 'manual',
      status: 'completed',
      checkedThroughDate: stringValue(report.checkedThroughDate),
      note: stringValue(report.note),
      bookingCount: intValue(report.bookingCount),
      revenueAmountMinor: nullableIntValue(report.revenueAmountMinor),
      currency: stringValue(report.currency) ?? 'SEK',
      hasMixedCurrencies: booleanValue(report.hasMixedCurrencies),
      createdByUserId: stringValue(report.createdByUserId) ?? '',
      createdAt:
        report.createdAt instanceof Date
          ? report.createdAt.toISOString()
          : stringValue(report.createdAt) ?? '',
    };
  });
}

function intValue(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return 0;
}

function nullableIntValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return intValue(value);
}

function booleanValue(value: unknown) {
  return value === true;
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}
