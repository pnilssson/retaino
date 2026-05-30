import {
  BILLING_PLAN_CATALOG,
  BILLING_PLAN_KEYS,
  type BillingPlanKey,
} from '@retaino/shared/contracts';

type BillingPlanPriceBindingName =
  `STRIPE_PRICE_${Uppercase<BillingPlanKey>}_ID`;

export type BillingCatalogBindings = Partial<
  Record<BillingPlanPriceBindingName, string>
>;

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
};

export function getStripeBillingCatalog(
  bindings: BillingCatalogBindings,
): StripeBillingCatalog {
  return {
    plans: buildPlanCatalog(bindings),
  };
}

export function getBillingCatalogBindingNames() {
  return {
    plans: Object.fromEntries(
      BILLING_PLAN_KEYS.map((key) => [key, planPriceBindingName(key)]),
    ) as Record<BillingPlanKey, BillingPlanPriceBindingName>,
  };
}

function buildPlanCatalog(bindings: BillingCatalogBindings) {
  return Object.fromEntries(
    BILLING_PLAN_KEYS.map((key) => {
      const bindingName = planPriceBindingName(key);

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

function planPriceBindingName(
  planKey: BillingPlanKey,
): BillingPlanPriceBindingName {
  return `STRIPE_PRICE_${planKey.toUpperCase()}_ID` as BillingPlanPriceBindingName;
}

function requiredCatalogBinding(value: string | undefined, name: string) {
  const input = value?.trim();

  if (!input) {
    throw new Error(`${name} is required.`);
  }

  return input;
}
