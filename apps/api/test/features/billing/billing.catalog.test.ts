import { describe, expect, it } from 'vitest';
import { BILLING_PLAN_KEYS } from '@retaino/shared/contracts';
import {
  getBillingCatalogBindingNames,
  getStripeBillingCatalog,
} from '../../../src/features/billing/billing.catalog';

const catalogBindings = {
  STRIPE_PRICE_ADVANCED_ID: 'price_advanced',
  STRIPE_PRICE_CORE_ID: 'price_core',
  STRIPE_PRICE_GROWTH_ID: 'price_growth',
  STRIPE_PRICE_PRO_ID: 'price_pro',
  STRIPE_PRICE_SCALE_ID: 'price_scale',
  STRIPE_PRICE_STARTER_ID: 'price_starter',
};

describe('Stripe billing catalog', () => {
  it('keeps every shared catalog item mapped to a Stripe price binding', () => {
    const bindingNames = getBillingCatalogBindingNames();

    expect(Object.keys(bindingNames.plans)).toEqual([...BILLING_PLAN_KEYS]);
    expect(bindingNames.plans).toEqual({
      starter: 'STRIPE_PRICE_STARTER_ID',
      core: 'STRIPE_PRICE_CORE_ID',
      growth: 'STRIPE_PRICE_GROWTH_ID',
      pro: 'STRIPE_PRICE_PRO_ID',
      scale: 'STRIPE_PRICE_SCALE_ID',
      advanced: 'STRIPE_PRICE_ADVANCED_ID',
    });
  });

  it('maps subscription plans to configured Stripe price IDs', () => {
    const catalog = getStripeBillingCatalog(catalogBindings);

    expect(catalog.plans.starter).toMatchObject({
      key: 'starter',
      stripePriceId: 'price_starter',
      monthlyPriceSek: 999,
      includedSmsCredits: 500,
    });
    expect(catalog.plans.core).toMatchObject({
      key: 'core',
      stripePriceId: 'price_core',
      monthlyPriceSek: 1999,
      includedSmsCredits: 1000,
    });
    expect(catalog.plans.growth).toMatchObject({
      key: 'growth',
      stripePriceId: 'price_growth',
      monthlyPriceSek: 2999,
      includedSmsCredits: 1500,
    });
    expect(catalog.plans.pro).toMatchObject({
      key: 'pro',
      stripePriceId: 'price_pro',
      monthlyPriceSek: 4999,
      includedSmsCredits: 2500,
    });
    expect(catalog.plans.scale).toMatchObject({
      key: 'scale',
      stripePriceId: 'price_scale',
      monthlyPriceSek: 7999,
      includedSmsCredits: 4000,
    });
    expect(catalog.plans.advanced).toMatchObject({
      key: 'advanced',
      stripePriceId: 'price_advanced',
      monthlyPriceSek: 14999,
      includedSmsCredits: 7500,
    });
  });

  it('fails clearly when a required price ID is missing', () => {
    expect(() =>
      getStripeBillingCatalog({
        ...catalogBindings,
        STRIPE_PRICE_GROWTH_ID: '',
      }),
    ).toThrow('STRIPE_PRICE_GROWTH_ID is required.');
  });
});
