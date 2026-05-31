import { z } from 'zod';
import { currencyCodeSchema } from '../money';
import { idSchema, nonEmptyStringSchema, timestampSchema } from '../schemas';
import {
  campaignStatusSchema,
  smsSenderStatusSchema,
} from './campaigns';

export const OVERVIEW_WINDOW_DAYS = 30;

export const overviewAttentionActionSchema = z.enum([
  'open_inbox',
  'open_billing',
  'open_legal',
  'open_campaign',
  'report_bookings',
]);

export const overviewAttentionToneSchema = z.enum([
  'warning',
  'critical',
  'neutral',
]);

export const overviewCampaignNextActionSchema = z.enum([
  'continue_setup',
  'monitor_send',
  'review_report',
  'report_bookings',
  'fix_campaign',
]);

export const overviewResponseSchema = z.object({
  window: z.object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    days: z.literal(OVERVIEW_WINDOW_DAYS),
  }),
  metrics: z.object({
    reportedRevenueAmountMinor: z.number().int().nonnegative().nullable(),
    reportedRevenueCurrency: currencyCodeSchema,
    reportedRevenueHasMixedCurrencies: z.boolean(),
    reportedBookingCount: z.number().int().nonnegative(),
    needsReplyCount: z.number().int().nonnegative(),
    smsCreditBalance: z.number().int(),
  }),
  sender: z.object({
    phoneNumber: nonEmptyStringSchema.nullable(),
    status: smsSenderStatusSchema.nullable(),
    countryCode: nonEmptyStringSchema.nullable(),
    releaseScheduledAt: timestampSchema.nullable(),
  }),
  trend: z.array(
    z.object({
      date: z.iso.date(),
      deliveredSmsCount: z.number().int().nonnegative(),
      reportedBookingCount: z.number().int().nonnegative(),
      reportedRevenueAmountMinor: z.number().int().nonnegative().nullable(),
    }),
  ),
  funnel: z.object({
    selectedCount: z.number().int().nonnegative(),
    sentCount: z.number().int().nonnegative(),
    deliveredCount: z.number().int().nonnegative(),
    inboundReplyCount: z.number().int().nonnegative(),
    reportedBookingCount: z.number().int().nonnegative(),
  }),
  recentCampaigns: z.array(
    z.object({
      id: idSchema,
      name: nonEmptyStringSchema,
      status: campaignStatusSchema,
      sentAt: timestampSchema.nullable(),
      deliveredCount: z.number().int().nonnegative(),
      inboundReplyCount: z.number().int().nonnegative(),
      optOutCount: z.number().int().nonnegative(),
      reportedBookingCount: z.number().int().nonnegative(),
      reportedRevenueAmountMinor: z.number().int().nonnegative().nullable(),
      reportedRevenueCurrency: currencyCodeSchema,
      reportedRevenueHasMixedCurrencies: z.boolean(),
      nextAction: overviewCampaignNextActionSchema,
    }),
  ),
  attentionItems: z.array(
    z.object({
      id: nonEmptyStringSchema,
      tone: overviewAttentionToneSchema,
      title: nonEmptyStringSchema,
      description: nonEmptyStringSchema,
      action: overviewAttentionActionSchema,
    }),
  ),
});

export type OverviewAttentionAction = z.infer<
  typeof overviewAttentionActionSchema
>;
export type OverviewCampaignNextAction = z.infer<
  typeof overviewCampaignNextActionSchema
>;
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;
