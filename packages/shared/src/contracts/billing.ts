import { z } from 'zod';
import { nonEmptyStringSchema, timestampSchema } from '../schemas';

export const BILLING_PLAN_KEYS = [
  'starter',
  'core',
  'growth',
  'pro',
  'scale',
  'advanced',
] as const;

export const BILLING_SUBSCRIPTION_STATUSES = [
  'none',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
] as const;

export const SMS_CREDIT_TRANSACTION_SOURCES = [
  'stripe_invoice',
  'campaign_send',
  'campaign_test_send',
  'manual_reply',
  'manual_adjustment',
] as const;

export const SMS_CREDIT_TRANSACTION_TYPES = [
  'grant',
  'debit',
  'adjustment',
] as const;

export const BILLING_PLAN_CATALOG = {
  starter: {
    label: 'Starter',
    monthlyPriceSek: 849,
    includedSmsCredits: 300,
    recommended: false,
  },
  core: {
    label: 'Core',
    monthlyPriceSek: 1749,
    includedSmsCredits: 750,
    recommended: false,
  },
  growth: {
    label: 'Growth',
    monthlyPriceSek: 3249,
    includedSmsCredits: 1500,
    recommended: true,
  },
  pro: {
    label: 'Pro',
    monthlyPriceSek: 5249,
    includedSmsCredits: 2500,
    recommended: false,
  },
  scale: {
    label: 'Scale',
    monthlyPriceSek: 8249,
    includedSmsCredits: 4000,
    recommended: false,
  },
  advanced: {
    label: 'Advanced',
    monthlyPriceSek: 15249,
    includedSmsCredits: 7500,
    recommended: false,
  },
} as const satisfies Record<
  BillingPlanKey,
  {
    label: string;
    monthlyPriceSek: number;
    includedSmsCredits: number;
    recommended: boolean;
  }
>;

export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number];
export type BillingSubscriptionStatus =
  (typeof BILLING_SUBSCRIPTION_STATUSES)[number];
export type SmsCreditTransactionSource =
  (typeof SMS_CREDIT_TRANSACTION_SOURCES)[number];
export type SmsCreditTransactionType =
  (typeof SMS_CREDIT_TRANSACTION_TYPES)[number];

export const billingPlanKeySchema = z.enum(BILLING_PLAN_KEYS);
export const billingSubscriptionStatusSchema = z.enum(
  BILLING_SUBSCRIPTION_STATUSES,
);
export const smsCreditTransactionSourceSchema = z.enum(
  SMS_CREDIT_TRANSACTION_SOURCES,
);
export const smsCreditTransactionTypeSchema = z.enum(
  SMS_CREDIT_TRANSACTION_TYPES,
);

export const createSubscriptionCheckoutSchema = z
  .object({
    planKey: billingPlanKeySchema,
  })
  .strict();

export const billingCheckoutUrlResponseSchema = z.object({
  url: z.url(),
});

export const billingPortalUrlResponseSchema = z.object({
  url: z.url(),
});

export const billingSubscriptionSchema = z.object({
  status: billingSubscriptionStatusSchema,
  planKey: billingPlanKeySchema.nullable(),
  currentPeriodEnd: timestampSchema.nullable(),
  cancelAtPeriodEnd: z.boolean(),
});

export const billingCreditBalanceSchema = z.object({
  balance: z.number().int(),
});

export const billingStatusResponseSchema = z.object({
  subscription: billingSubscriptionSchema,
  smsCredits: billingCreditBalanceSchema,
  portalAvailable: z.boolean(),
});

export const smsCreditTransactionSchema = z.object({
  transactionType: smsCreditTransactionTypeSchema,
  source: smsCreditTransactionSourceSchema,
  sourceId: nonEmptyStringSchema,
  credits: z.number().int(),
  periodStart: timestampSchema.nullable(),
  periodEnd: timestampSchema.nullable(),
  description: nonEmptyStringSchema,
  createdAt: timestampSchema,
});

export type CreateSubscriptionCheckoutInput = z.infer<
  typeof createSubscriptionCheckoutSchema
>;
export type BillingCheckoutUrlResponse = z.infer<
  typeof billingCheckoutUrlResponseSchema
>;
export type BillingPortalUrlResponse = z.infer<
  typeof billingPortalUrlResponseSchema
>;
export type BillingSubscription = z.infer<typeof billingSubscriptionSchema>;
export type BillingCreditBalance = z.infer<typeof billingCreditBalanceSchema>;
export type BillingStatusResponse = z.infer<
  typeof billingStatusResponseSchema
>;
export type SmsCreditTransaction = z.infer<typeof smsCreditTransactionSchema>;

export function getBillingPlanCredits(planKey: BillingPlanKey) {
  return BILLING_PLAN_CATALOG[planKey].includedSmsCredits;
}

export function getRecommendedBillingPlanKey() {
  return BILLING_PLAN_KEYS.find(
    (planKey) => BILLING_PLAN_CATALOG[planKey].recommended,
  ) as BillingPlanKey;
}

export function hasCurrentBillingSubscription(
  status: string | null | undefined,
) {
  return status === 'active' || status === 'trialing';
}
