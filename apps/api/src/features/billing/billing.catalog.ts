import {
  BILLING_PLAN_CATALOG,
  BILLING_PLAN_KEYS,
  CREDIT_PACK_CATALOG,
  CREDIT_PACK_KEYS,
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

const BILLING_PLAN_PRICE_BINDINGS = {
  starter: 'STRIPE_PRICE_STARTER_ID',
  growth: 'STRIPE_PRICE_GROWTH_ID',
  scale: 'STRIPE_PRICE_SCALE_ID',
} as const satisfies Record<BillingPlanKey, keyof BillingCatalogBindings>;

const CREDIT_PACK_PRICE_BINDINGS = {
  credits_500: 'STRIPE_PRICE_CREDITS_500_ID',
  credits_1500: 'STRIPE_PRICE_CREDITS_1500_ID',
  credits_5000: 'STRIPE_PRICE_CREDITS_5000_ID',
} as const satisfies Record<CreditPackKey, keyof BillingCatalogBindings>;

export function getStripeBillingCatalog(
  bindings: BillingCatalogBindings,
): StripeBillingCatalog {
  return {
    plans: buildPlanCatalog(bindings),
    creditPacks: buildCreditPackCatalog(bindings),
  };
}

export function getBillingCatalogBindingNames() {
  return {
    plans: BILLING_PLAN_PRICE_BINDINGS,
    creditPacks: CREDIT_PACK_PRICE_BINDINGS,
  };
}

function buildPlanCatalog(bindings: BillingCatalogBindings) {
  return Object.fromEntries(
    BILLING_PLAN_KEYS.map((key) => {
      const bindingName = BILLING_PLAN_PRICE_BINDINGS[key];

      return [
        key,
        {
          key,
          stripePriceId: requiredCatalogBinding(
            bindings[bindingName],
            bindingName,
          ),
          ...BILLING_PLAN_CATALOG[key],
        },
      ];
    }),
  ) as StripeBillingCatalog['plans'];
}

function buildCreditPackCatalog(bindings: BillingCatalogBindings) {
  return Object.fromEntries(
    CREDIT_PACK_KEYS.map((key) => {
      const bindingName = CREDIT_PACK_PRICE_BINDINGS[key];

      return [
        key,
        {
          key,
          stripePriceId: requiredCatalogBinding(
            bindings[bindingName],
            bindingName,
          ),
          ...CREDIT_PACK_CATALOG[key],
        },
      ];
    }),
  ) as StripeBillingCatalog['creditPacks'];
}

function requiredCatalogBinding(value: string | undefined, name: string) {
  const input = value?.trim();

  if (!input) {
    throw new Error(`${name} is required.`);
  }

  return input;
}
