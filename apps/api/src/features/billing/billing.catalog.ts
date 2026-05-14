import {
  BILLING_PLAN_CATALOG,
  CREDIT_PACK_CATALOG,
  type BillingPlanKey,
  type CreditPackKey,
} from '@retaino/shared/contracts';

export type BillingCatalogBindings = {
  STRIPE_PRICE_CREDITS_1500_ID?: string;
  STRIPE_PRICE_CREDITS_5000_ID?: string;
  STRIPE_PRICE_CREDITS_500_ID?: string;
  STRIPE_PRICE_GROWTH_ID?: string;
  STRIPE_PRICE_SCALE_ID?: string;
  STRIPE_PRICE_STARTER_ID?: string;
};

export type StripeBillingCatalog = {
  plans: Record<
    BillingPlanKey,
    {
      key: BillingPlanKey;
      stripePriceId: string;
      label: string;
      monthlyPriceSek: number;
      includedSmsCredits: number;
    }
  >;
  creditPacks: Record<
    CreditPackKey,
    {
      key: CreditPackKey;
      stripePriceId: string;
      label: string;
      priceSek: number;
      smsCredits: number;
    }
  >;
};

export function getStripeBillingCatalog(
  bindings: BillingCatalogBindings,
): StripeBillingCatalog {
  return {
    plans: {
      starter: {
        key: 'starter',
        stripePriceId: requiredCatalogBinding(
          bindings.STRIPE_PRICE_STARTER_ID,
          'STRIPE_PRICE_STARTER_ID',
        ),
        ...BILLING_PLAN_CATALOG.starter,
      },
      growth: {
        key: 'growth',
        stripePriceId: requiredCatalogBinding(
          bindings.STRIPE_PRICE_GROWTH_ID,
          'STRIPE_PRICE_GROWTH_ID',
        ),
        ...BILLING_PLAN_CATALOG.growth,
      },
      scale: {
        key: 'scale',
        stripePriceId: requiredCatalogBinding(
          bindings.STRIPE_PRICE_SCALE_ID,
          'STRIPE_PRICE_SCALE_ID',
        ),
        ...BILLING_PLAN_CATALOG.scale,
      },
    },
    creditPacks: {
      credits_500: {
        key: 'credits_500',
        stripePriceId: requiredCatalogBinding(
          bindings.STRIPE_PRICE_CREDITS_500_ID,
          'STRIPE_PRICE_CREDITS_500_ID',
        ),
        ...CREDIT_PACK_CATALOG.credits_500,
      },
      credits_1500: {
        key: 'credits_1500',
        stripePriceId: requiredCatalogBinding(
          bindings.STRIPE_PRICE_CREDITS_1500_ID,
          'STRIPE_PRICE_CREDITS_1500_ID',
        ),
        ...CREDIT_PACK_CATALOG.credits_1500,
      },
      credits_5000: {
        key: 'credits_5000',
        stripePriceId: requiredCatalogBinding(
          bindings.STRIPE_PRICE_CREDITS_5000_ID,
          'STRIPE_PRICE_CREDITS_5000_ID',
        ),
        ...CREDIT_PACK_CATALOG.credits_5000,
      },
    },
  };
}

function requiredCatalogBinding(value: string | undefined, name: string) {
  const input = value?.trim();

  if (!input) {
    throw new Error(`${name} is required.`);
  }

  return input;
}
