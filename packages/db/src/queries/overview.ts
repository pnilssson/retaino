import { sql } from 'drizzle-orm';
import {
  OVERVIEW_WINDOW_DAYS,
  type BillingSubscriptionStatus,
  type CampaignStatus,
  type OverviewResponse,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import {
  campaignMessageEvents,
  campaignRecipients,
  campaigns,
  organizationBillingProfiles,
  organizationProfiles,
  organizationSmsSenders,
  reportedBookings,
  smsConversations,
  smsCreditTransactions,
  smsMessages,
  suppressions,
} from '../schema';
import { assertOrganizationId } from './contacts';

type OverviewRow = Record<string, unknown>;

type RawRecentCampaign = {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  sentAt?: unknown;
  deliveredCount?: unknown;
  inboundReplyCount?: unknown;
  optOutCount?: unknown;
  reportedBookingCount?: unknown;
  reportedRevenueAmountMinor?: unknown;
  reportedRevenueCurrency?: unknown;
  reportedRevenueHasMixedCurrencies?: unknown;
};

export async function getOverviewDashboard(
  db: DbClient,
  input: { organizationId: string; now?: Date },
): Promise<OverviewResponse> {
  assertOrganizationId(input.organizationId);

  const now = input.now ?? new Date();
  const endDate = utcDateLabel(now);
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (OVERVIEW_WINDOW_DAYS - 1),
    ),
  );
  const startDate = utcDateLabel(start);
  const result = await db.execute(sql`
    with input as (
      select
        ${input.organizationId}::uuid as organization_id,
        ${startDate}::date as start_date,
        ${endDate}::date as end_date,
        ${now}::timestamptz as now_at
    ),
    organization_profile as (
      select ${organizationProfiles.currency} as currency
      from ${organizationProfiles}, input
      where ${organizationProfiles.organizationId} = input.organization_id
      limit 1
    ),
    reported_window as (
      select
        ${reportedBookings.id},
        ${reportedBookings.campaignId},
        ${reportedBookings.bookingDate},
        ${reportedBookings.revenueAmountMinor},
        ${reportedBookings.currency}
      from ${reportedBookings}, input
      where ${reportedBookings.organizationId} = input.organization_id
        and ${reportedBookings.bookingDate} >= input.start_date
        and ${reportedBookings.bookingDate} <= input.end_date
    ),
    reported_outcome as (
      select
        count(id)::integer as reported_booking_count,
        case
          when count(distinct currency) filter (
            where revenue_amount_minor is not null
          ) > 1 then null
          else coalesce(sum(revenue_amount_minor), 0)::bigint
        end as reported_revenue_amount_minor,
        coalesce(
          max(currency) filter (where revenue_amount_minor is not null),
          max(currency),
          (select currency from organization_profile),
          ${'SEK'}
        ) as reported_revenue_currency,
        (
          count(distinct currency) filter (
            where revenue_amount_minor is not null
          ) > 1
        ) as reported_revenue_has_mixed_currencies
      from reported_window
    ),
    trend_days as (
      select generate_series(
        (select start_date from input),
        (select end_date from input),
        interval '1 day'
      )::date as day
    ),
    trend_reported_rollup as (
      select
        trend_days.day,
        count(reported_window.id)::integer as reported_booking_count,
        case
          when count(distinct reported_window.currency) filter (
            where reported_window.revenue_amount_minor is not null
          ) > 1 then null
          else coalesce(sum(reported_window.revenue_amount_minor), 0)::bigint
        end as reported_revenue_amount_minor
      from trend_days
      left join reported_window
        on reported_window.booking_date = trend_days.day
      group by trend_days.day
    ),
    trend_delivery_rollup as (
      select
        trend_days.day,
        count(${smsMessages.id}) filter (
          where ${smsMessages.direction} = ${'outbound'}
            and ${smsMessages.status} = ${'delivered'}
        )::integer as delivered_sms_count
      from trend_days
      join input on true
      left join ${smsMessages}
        on ${smsMessages.organizationId} = input.organization_id
        and ${smsMessages.campaignId} is not null
        and ${smsMessages.createdAt} >= trend_days.day
        and ${smsMessages.createdAt} < trend_days.day + interval '1 day'
      group by trend_days.day
    ),
    trend_rollup as (
      select
        trend_days.day,
        coalesce(
          trend_delivery_rollup.delivered_sms_count,
          0
        ) as delivered_sms_count,
        coalesce(
          trend_reported_rollup.reported_booking_count,
          0
        ) as reported_booking_count,
        trend_reported_rollup.reported_revenue_amount_minor
      from trend_days
      left join trend_reported_rollup
        on trend_reported_rollup.day = trend_days.day
      left join trend_delivery_rollup
        on trend_delivery_rollup.day = trend_days.day
      order by trend_days.day
    ),
    trend_json as (
      select json_agg(
        json_build_object(
          'date', trend_rollup.day::text,
          'deliveredSmsCount', trend_rollup.delivered_sms_count,
          'reportedBookingCount', trend_rollup.reported_booking_count,
          'reportedRevenueAmountMinor',
            trend_rollup.reported_revenue_amount_minor
        )
        order by trend_rollup.day
      ) as trend
      from trend_rollup
    ),
    needs_reply as (
      select count(*)::integer as needs_reply_count
      from (
        select
          ${smsConversations.id},
          max(coalesce(
            ${smsMessages.receivedAt},
            ${smsMessages.sentAt},
            ${smsMessages.createdAt}
          )) filter (where ${smsMessages.direction} = ${'inbound'})
            as last_inbound_at,
          max(coalesce(
            ${smsMessages.receivedAt},
            ${smsMessages.sentAt},
            ${smsMessages.createdAt}
          )) filter (where ${smsMessages.direction} = ${'outbound'})
            as last_outbound_at,
          bool_or(${suppressions.id} is not null) as reply_blocked
        from ${smsConversations}
        inner join ${smsMessages}
          on ${smsMessages.organizationId} = ${smsConversations.organizationId}
          and ${smsMessages.phoneHash} = ${smsConversations.phoneHash}
        left join ${suppressions}
          on ${suppressions.organizationId} = ${smsConversations.organizationId}
          and ${suppressions.type} = ${'phone'}
          and ${suppressions.valueHash} = ${smsConversations.phoneHash}
        join input
          on ${smsConversations.organizationId} = input.organization_id
        group by ${smsConversations.id}
      ) conversations
      where conversations.last_inbound_at is not null
        and (
          conversations.last_outbound_at is null
          or conversations.last_inbound_at > conversations.last_outbound_at
        )
        and conversations.reply_blocked = false
    ),
    credit_balance as (
      select coalesce(sum(${smsCreditTransactions.credits}), 0)::integer
        as sms_credit_balance
      from ${smsCreditTransactions}, input
      where ${smsCreditTransactions.organizationId} = input.organization_id
        and (
          ${smsCreditTransactions.creditBucket} = ${'purchased'}
          or (
            ${smsCreditTransactions.creditBucket} = ${'subscription_period'}
            and ${smsCreditTransactions.periodStart} <= input.now_at
            and ${smsCreditTransactions.periodEnd} > input.now_at
          )
        )
    ),
    funnel_recipients as (
      select
        count(${campaignRecipients.id})::integer as selected_count
      from input
      left join ${campaignRecipients}
        on ${campaignRecipients.organizationId} = input.organization_id
        and ${campaignRecipients.createdAt} >= input.start_date
        and ${campaignRecipients.createdAt} < input.end_date + interval '1 day'
    ),
    funnel_messages as (
      select
        count(${smsMessages.id}) filter (
          where ${smsMessages.direction} = ${'outbound'}
        )::integer as sent_count,
        count(${smsMessages.id}) filter (
          where ${smsMessages.direction} = ${'outbound'}
            and ${smsMessages.status} = ${'delivered'}
        )::integer as delivered_count,
        count(${smsMessages.id}) filter (
          where ${smsMessages.direction} = ${'inbound'}
        )::integer as inbound_reply_count
      from input
      left join ${smsMessages}
        on ${smsMessages.organizationId} = input.organization_id
        and ${smsMessages.campaignId} is not null
        and ${smsMessages.createdAt} >= input.start_date
        and ${smsMessages.createdAt} < input.end_date + interval '1 day'
    ),
    recent_campaign_rows as (
      select
        ${campaigns.id},
        ${campaigns.name},
        ${campaigns.status},
        ${campaigns.sentAt},
        (
          select count(*)::integer
          from ${smsMessages}
          where ${smsMessages.organizationId} = input.organization_id
            and ${smsMessages.campaignId} = ${campaigns.id}
            and ${smsMessages.direction} = ${'outbound'}
            and ${smsMessages.status} = ${'delivered'}
        ) as delivered_count,
        (
          select count(*)::integer
          from ${smsMessages}
          where ${smsMessages.organizationId} = input.organization_id
            and ${smsMessages.campaignId} = ${campaigns.id}
            and ${smsMessages.direction} = ${'inbound'}
        ) as inbound_reply_count,
        (
          select count(*)::integer
          from ${campaignMessageEvents}
          where ${campaignMessageEvents.organizationId} = input.organization_id
            and ${campaignMessageEvents.campaignId} = ${campaigns.id}
            and ${campaignMessageEvents.eventType} = ${'opt_out'}
        ) as opt_out_count,
        (
          select count(*)::integer
          from ${reportedBookings}
          where ${reportedBookings.organizationId} = input.organization_id
            and ${reportedBookings.campaignId} = ${campaigns.id}
        ) as reported_booking_count,
        (
          select case
            when count(distinct ${reportedBookings.currency}) filter (
              where ${reportedBookings.revenueAmountMinor} is not null
            ) > 1 then null
            else coalesce(sum(${reportedBookings.revenueAmountMinor}), 0)::bigint
          end
          from ${reportedBookings}
          where ${reportedBookings.organizationId} = input.organization_id
            and ${reportedBookings.campaignId} = ${campaigns.id}
        ) as reported_revenue_amount_minor,
        (
          select coalesce(
            max(${reportedBookings.currency}) filter (
              where ${reportedBookings.revenueAmountMinor} is not null
            ),
            max(${reportedBookings.currency}),
            (select currency from organization_profile),
            ${'SEK'}
          )
          from ${reportedBookings}
          where ${reportedBookings.organizationId} = input.organization_id
            and ${reportedBookings.campaignId} = ${campaigns.id}
        ) as reported_revenue_currency,
        (
          select (
            count(distinct ${reportedBookings.currency}) filter (
              where ${reportedBookings.revenueAmountMinor} is not null
            ) > 1
          )
          from ${reportedBookings}
          where ${reportedBookings.organizationId} = input.organization_id
            and ${reportedBookings.campaignId} = ${campaigns.id}
        ) as reported_revenue_has_mixed_currencies
      from ${campaigns}
      join input on ${campaigns.organizationId} = input.organization_id
      order by ${campaigns.createdAt} desc
      limit 5
    ),
    recent_campaigns_json as (
      select coalesce(
        json_agg(
          json_build_object(
            'id', id,
            'name', name,
            'status', status,
            'sentAt', sent_at,
            'deliveredCount', delivered_count,
            'inboundReplyCount', inbound_reply_count,
            'optOutCount', opt_out_count,
            'reportedBookingCount', reported_booking_count,
            'reportedRevenueAmountMinor', reported_revenue_amount_minor,
            'reportedRevenueCurrency', reported_revenue_currency,
            'reportedRevenueHasMixedCurrencies',
              reported_revenue_has_mixed_currencies
          )
          order by sent_at desc nulls last, id
        ),
        '[]'::json
      ) as recent_campaigns
      from recent_campaign_rows
    ),
    billing as (
      select ${organizationBillingProfiles.subscriptionStatus}
        as subscription_status
      from ${organizationBillingProfiles}, input
      where ${organizationBillingProfiles.organizationId} = input.organization_id
      limit 1
    ),
    sender as (
      select
        ${organizationSmsSenders.releaseScheduledAt} as release_scheduled_at
      from ${organizationSmsSenders}, input
      where ${organizationSmsSenders.organizationId} = input.organization_id
      order by ${organizationSmsSenders.updatedAt} desc
      limit 1
    )
    select
      reported_outcome.reported_booking_count,
      reported_outcome.reported_revenue_amount_minor,
      reported_outcome.reported_revenue_currency,
      reported_outcome.reported_revenue_has_mixed_currencies,
      needs_reply.needs_reply_count,
      credit_balance.sms_credit_balance,
      funnel_recipients.selected_count,
      funnel_messages.sent_count,
      funnel_messages.delivered_count,
      funnel_messages.inbound_reply_count,
      trend_json.trend,
      recent_campaigns_json.recent_campaigns,
      billing.subscription_status,
      sender.release_scheduled_at
    from reported_outcome, needs_reply, credit_balance, funnel_recipients,
      funnel_messages,
      trend_json, recent_campaigns_json
    left join billing on true
    left join sender on true
  `);
  const [row = {}] = Array.from(result.rows ?? []) as OverviewRow[];
  const recentCampaigns = recentCampaignsValue(row.recent_campaigns);
  const metrics = {
    reportedRevenueAmountMinor: nullableIntValue(
      row.reported_revenue_amount_minor,
    ),
    reportedRevenueCurrency:
      stringValue(row.reported_revenue_currency) ?? 'SEK',
    reportedRevenueHasMixedCurrencies: booleanValue(
      row.reported_revenue_has_mixed_currencies,
    ),
    reportedBookingCount: intValue(row.reported_booking_count),
    needsReplyCount: intValue(row.needs_reply_count),
    smsCreditBalance: intValue(row.sms_credit_balance),
  };

  return {
    window: {
      startDate,
      endDate,
      days: OVERVIEW_WINDOW_DAYS,
    },
    metrics,
    trend: trendValue(row.trend),
    funnel: {
      selectedCount: intValue(row.selected_count),
      sentCount: intValue(row.sent_count),
      deliveredCount: intValue(row.delivered_count),
      inboundReplyCount: intValue(row.inbound_reply_count),
      reportedBookingCount: metrics.reportedBookingCount,
    },
    recentCampaigns,
    attentionItems: attentionItems({
      metrics,
      recentCampaigns,
      subscriptionStatus: stringValue(
        row.subscription_status,
      ) as BillingSubscriptionStatus | null,
      releaseScheduledAt: nullableIsoValue(row.release_scheduled_at),
    }),
  };
}

function attentionItems(input: {
  metrics: OverviewResponse['metrics'];
  recentCampaigns: OverviewResponse['recentCampaigns'];
  subscriptionStatus: BillingSubscriptionStatus | null;
  releaseScheduledAt: string | null;
}): OverviewResponse['attentionItems'] {
  const items: OverviewResponse['attentionItems'] = [];

  if (input.metrics.needsReplyCount > 0) {
    items.push({
      id: 'needs-reply',
      tone: 'warning',
      title: `${formatCount(input.metrics.needsReplyCount)} conversations need a reply`,
      description: 'Answer recent replies before the customer moves on.',
      action: 'open_inbox',
    });
  }

  if (input.metrics.smsCreditBalance <= 0) {
    items.push({
      id: 'credits-empty',
      tone: 'critical',
      title: 'SMS credits are empty',
      description: 'Buy credits before sending campaigns or inbox replies.',
      action: 'open_billing',
    });
  } else if (input.metrics.smsCreditBalance < 50) {
    items.push({
      id: 'credits-low',
      tone: 'warning',
      title: 'SMS credits are running low',
      description: 'Review the balance before the next campaign.',
      action: 'open_billing',
    });
  }

  if (
    input.subscriptionStatus &&
    input.subscriptionStatus !== 'active' &&
    input.subscriptionStatus !== 'trialing'
  ) {
    items.push({
      id: 'billing-inactive',
      tone: 'critical',
      title: 'Billing needs attention',
      description: 'Restore subscription access before sending SMS.',
      action: 'open_billing',
    });
  }

  if (input.releaseScheduledAt) {
    items.push({
      id: 'sender-release-scheduled',
      tone: 'warning',
      title: 'SMS sender release is scheduled',
      description: 'Restore billing access to keep the sender number.',
      action: 'open_billing',
    });
  }

  const failedCampaign = input.recentCampaigns.find(
    (campaign) => campaign.status === 'failed',
  );

  if (failedCampaign) {
    items.push({
      id: `campaign-failed:${failedCampaign.id}`,
      tone: 'critical',
      title: 'A campaign failed',
      description: 'Review the failed campaign before starting another send.',
      action: 'open_campaign',
    });
  }

  const unreportedCampaign = input.recentCampaigns.find(
    (campaign) =>
      campaign.status === 'sent' && campaign.reportedBookingCount === 0,
  );

  if (unreportedCampaign) {
    items.push({
      id: `report-bookings:${unreportedCampaign.id}`,
      tone: 'neutral',
      title: 'Report bookings for the latest campaign',
      description: 'Add bookings and revenue so the report reflects outcomes.',
      action: 'report_bookings',
    });
  }

  return items;
}

function recentCampaignsValue(
  value: unknown,
): OverviewResponse['recentCampaigns'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((raw) => {
    const campaign = raw as RawRecentCampaign;
    const status = campaignStatusValue(campaign.status);
    const reportedBookingCount = intValue(campaign.reportedBookingCount);

    return {
      id: stringValue(campaign.id) ?? '',
      name: stringValue(campaign.name) ?? 'Campaign',
      status,
      sentAt: nullableIsoValue(campaign.sentAt),
      deliveredCount: intValue(campaign.deliveredCount),
      inboundReplyCount: intValue(campaign.inboundReplyCount),
      optOutCount: intValue(campaign.optOutCount),
      reportedBookingCount,
      reportedRevenueAmountMinor: nullableIntValue(
        campaign.reportedRevenueAmountMinor,
      ),
      reportedRevenueCurrency:
        stringValue(campaign.reportedRevenueCurrency) ?? 'SEK',
      reportedRevenueHasMixedCurrencies: booleanValue(
        campaign.reportedRevenueHasMixedCurrencies,
      ),
      nextAction: campaignNextAction(status, reportedBookingCount),
    };
  });
}

function campaignNextAction(
  status: CampaignStatus,
  reportedBookingCount: number,
): OverviewResponse['recentCampaigns'][number]['nextAction'] {
  if (status === 'failed') {
    return 'fix_campaign';
  }

  if (status === 'sending') {
    return 'monitor_send';
  }

  if (status === 'sent') {
    return reportedBookingCount > 0 ? 'review_report' : 'report_bookings';
  }

  return 'continue_setup';
}

function campaignStatusValue(value: unknown): CampaignStatus {
  if (
    value === 'draft' ||
    value === 'ready_to_send' ||
    value === 'sending' ||
    value === 'sent' ||
    value === 'failed'
  ) {
    return value;
  }

  return 'draft';
}

function trendValue(value: unknown): OverviewResponse['trend'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((raw) => {
    const row = raw as Record<string, unknown>;

    return {
      date: stringValue(row.date) ?? '',
      deliveredSmsCount: intValue(row.deliveredSmsCount),
      reportedBookingCount: intValue(row.reportedBookingCount),
      reportedRevenueAmountMinor: nullableIntValue(
        row.reportedRevenueAmountMinor,
      ),
    };
  });
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
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

function nullableIsoValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value) {
    return new Date(value).toISOString();
  }

  return null;
}

function utcDateLabel(value: Date) {
  return value.toISOString().slice(0, 10);
}
