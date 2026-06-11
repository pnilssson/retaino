import { sql } from 'drizzle-orm';
import type { CampaignReport } from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import {
  campaignMessageEvents,
  campaignRecipients,
  clickEvents,
  contacts,
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
        count(distinct ${smsMessages.recipientId}) filter (
          where direction = ${'inbound'}
        )::integer as inbound_reply_count,
        coalesce(sum(estimated_segment_count) filter (
          where direction = ${'outbound'}
        ), 0)::integer as estimated_sms_segments,
        coalesce(
          sum(coalesce(actual_segment_count, estimated_segment_count, 0)) filter (
            where direction = ${'outbound'}
          ),
          0
        )::integer as actual_sms_segments
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
    reported_outcome as (
      select
        count(${reportedBookings.id})::integer as reported_booking_count,
        case
          when count(distinct ${reportedBookings.currency}) filter (
            where ${reportedBookings.revenueAmountMinor} is not null
          ) > 1 then null
          else coalesce(sum(${reportedBookings.revenueAmountMinor}), 0)::bigint
        end as reported_revenue_amount_minor,
        coalesce(
          max(${reportedBookings.currency}) filter (
            where ${reportedBookings.revenueAmountMinor} is not null
          ),
          max(${reportedBookings.currency}),
          (select currency from organization_profile),
          ${'SEK'}
        ) as reported_revenue_currency,
        (
          count(distinct ${reportedBookings.currency}) filter (
            where ${reportedBookings.revenueAmountMinor} is not null
          ) > 1
        ) as reported_has_mixed_currencies
      from ${reportedBookings}
      join input
        on ${reportedBookings.campaignId} = input.campaign_id
        and ${reportedBookings.organizationId} = input.organization_id
    ),
    reported_booking_rows as (
      select
        ${reportedBookings.id},
        ${reportedBookings.campaignId},
        ${reportedBookings.campaignRecipientId},
        ${reportedBookings.contactId},
        ${reportedBookings.source},
        ${reportedBookings.createdByUserId},
        ${reportedBookings.bookingDate},
        ${reportedBookings.revenueAmountMinor},
        ${reportedBookings.currency},
        ${reportedBookings.service},
        ${reportedBookings.note},
        ${reportedBookings.createdAt},
        ${contacts.name} as contact_name,
        ${contacts.phone} as contact_phone,
        ${contacts.email} as contact_email
      from ${reportedBookings}
      left join ${contacts}
        on ${contacts.id} = ${reportedBookings.contactId}
        and ${contacts.organizationId} = ${reportedBookings.organizationId}
      join input
        on ${reportedBookings.campaignId} = input.campaign_id
        and ${reportedBookings.organizationId} = input.organization_id
    ),
    reported_booking_summaries as (
      select coalesce(
        json_agg(
          json_build_object(
            'id', reported_booking_rows.id,
            'campaignId', reported_booking_rows.campaign_id,
            'campaignRecipientId', reported_booking_rows.campaign_recipient_id,
            'contactId', reported_booking_rows.contact_id,
            'source', reported_booking_rows.source,
            'createdByUserId', reported_booking_rows.created_by_user_id,
            'bookingDate', reported_booking_rows.booking_date,
            'revenueAmountMinor', reported_booking_rows.revenue_amount_minor,
            'currency', reported_booking_rows.currency,
            'service', reported_booking_rows.service,
            'note', reported_booking_rows.note,
            'createdAt', reported_booking_rows.created_at,
            'contact', json_build_object(
              'id', reported_booking_rows.contact_id,
              'name', reported_booking_rows.contact_name,
              'phone', reported_booking_rows.contact_phone,
              'email', reported_booking_rows.contact_email
            )
          )
          order by reported_booking_rows.booking_date desc,
            reported_booking_rows.created_at desc
        ),
        '[]'::json
      ) as reported_bookings
      from reported_booking_rows
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
      reported_outcome.reported_booking_count,
      reported_outcome.reported_revenue_amount_minor,
      reported_outcome.reported_revenue_currency,
      reported_outcome.reported_has_mixed_currencies,
      reported_booking_summaries.reported_bookings
    from recipient_counts, message_counts, event_counts, click_counts,
      reported_outcome, reported_booking_summaries
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
    reportedOutcome: {
      bookingCount: intValue(row.reported_booking_count),
      revenueAmountMinor: nullableIntValue(row.reported_revenue_amount_minor),
      currency: stringValue(row.reported_revenue_currency) ?? 'SEK',
      hasMixedCurrencies: booleanValue(row.reported_has_mixed_currencies),
      bookingRate:
        intValue(row.delivered_count) > 0
          ? intValue(row.reported_booking_count) / intValue(row.delivered_count)
          : 0,
    },
    reportedBookings: reportedBookingsValue(row.reported_bookings),
  };

  return report;
}

function reportedBookingsValue(
  value: unknown,
): CampaignReport['reportedBookings'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((row) => {
    const booking = row as Record<string, unknown>;

    return {
      id: stringValue(booking.id) ?? '',
      campaignId: stringValue(booking.campaignId) ?? '',
      campaignRecipientId: stringValue(booking.campaignRecipientId) ?? '',
      contactId: stringValue(booking.contactId) ?? '',
      source: 'manual',
      createdByUserId: stringValue(booking.createdByUserId) ?? '',
      bookingDate: stringValue(booking.bookingDate) ?? '',
      revenueAmountMinor: nullableIntValue(booking.revenueAmountMinor),
      currency: stringValue(booking.currency) ?? 'SEK',
      service: stringValue(booking.service),
      note: stringValue(booking.note),
      createdAt:
        booking.createdAt instanceof Date
          ? booking.createdAt.toISOString()
          : stringValue(booking.createdAt) ?? '',
      contact: contactValue(booking.contact),
    };
  });
}

function contactValue(value: unknown) {
  const contact = value as Record<string, unknown> | null;

  return {
    id: stringValue(contact?.id) ?? '',
    name: stringValue(contact?.name),
    phone: stringValue(contact?.phone),
    email: stringValue(contact?.email),
  };
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
