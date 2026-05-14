import { z } from 'zod';
import { nonEmptyStringSchema, timestampSchema } from '../schemas';

export const BILLING_PLAN_KEYS = ['starter', 'growth', 'scale'] as const;

export const CREDIT_PACK_KEYS = [
  'credits_500',
  'credits_1500',
  'credits_5000',
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
  'stripe_checkout_session',
  'campaign_send',
  'campaign_test_send',
  'stripe_refund',
  'stripe_credit_note',
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
    monthlyPriceSek: 699,
    includedSmsCredits: 300,
  },
  growth: {
    label: 'Growth',
    monthlyPriceSek: 1499,
    includedSmsCredits: 1000,
  },
  scale: {
    label: 'Scale',
    monthlyPriceSek: 2999,
    includedSmsCredits: 3000,
  },
} as const satisfies Record<
  BillingPlanKey,
  {
    label: string;
    monthlyPriceSek: number;
    includedSmsCredits: number;
  }
>;

export const CREDIT_PACK_CATALOG = {
  credits_500: {
    label: '500 credits',
    priceSek: 595,
    smsCredits: 500,
  },
  credits_1500: {
    label: '1,500 credits',
    priceSek: 1650,
    smsCredits: 1500,
  },
  credits_5000: {
    label: '5,000 credits',
    priceSek: 5000,
    smsCredits: 5000,
  },
} as const satisfies Record<
  CreditPackKey,
  {
    label: string;
    priceSek: number;
    smsCredits: number;
  }
>;

export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number];
export type CreditPackKey = (typeof CREDIT_PACK_KEYS)[number];
export type BillingSubscriptionStatus =
  (typeof BILLING_SUBSCRIPTION_STATUSES)[number];
export type SmsCreditTransactionSource =
  (typeof SMS_CREDIT_TRANSACTION_SOURCES)[number];
export type SmsCreditTransactionType =
  (typeof SMS_CREDIT_TRANSACTION_TYPES)[number];

export const billingPlanKeySchema = z.enum(BILLING_PLAN_KEYS);
export const creditPackKeySchema = z.enum(CREDIT_PACK_KEYS);
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

export const createCreditCheckoutSchema = z
  .object({
    packKey: creditPackKeySchema,
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
  description: nonEmptyStringSchema,
  createdAt: timestampSchema,
});

export type CreateSubscriptionCheckoutInput = z.infer<
  typeof createSubscriptionCheckoutSchema
>;
export type CreateCreditCheckoutInput = z.infer<
  typeof createCreditCheckoutSchema
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

export function getCreditPackCredits(packKey: CreditPackKey) {
  return CREDIT_PACK_CATALOG[packKey].smsCredits;
}
