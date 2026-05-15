import { describe, expect, it } from 'vitest';
import {
  BILLING_PLAN_KEYS,
  CREDIT_PACK_KEYS,
} from '@retaino/shared/contracts';
import {
  getBillingCatalogBindingNames,
  getStripeBillingCatalog,
} from '../../../src/features/billing/billing.catalog';

const catalogBindings = {
  STRIPE_PRICE_CREDITS_1500_ID: 'price_credits_1500',
  STRIPE_PRICE_CREDITS_5000_ID: 'price_credits_5000',
  STRIPE_PRICE_CREDITS_500_ID: 'price_credits_500',
  STRIPE_PRICE_GROWTH_ID: 'price_growth',
  STRIPE_PRICE_SCALE_ID: 'price_scale',
  STRIPE_PRICE_STARTER_ID: 'price_starter',
};

describe('Stripe billing catalog', () => {
  it('keeps every shared catalog item mapped to a Stripe price binding', () => {
    const bindingNames = getBillingCatalogBindingNames();

    expect(Object.keys(bindingNames.plans)).toEqual([...BILLING_PLAN_KEYS]);
    expect(Object.keys(bindingNames.creditPacks)).toEqual([...CREDIT_PACK_KEYS]);
  });

  it('maps subscription plans to configured Stripe price IDs', () => {
    const catalog = getStripeBillingCatalog(catalogBindings);

    expect(catalog.plans.starter).toMatchObject({
      key: 'starter',
      stripePriceId: 'price_starter',
      monthlyPriceSek: 699,
      includedSmsCredits: 300,
    });
    expect(catalog.plans.growth).toMatchObject({
      key: 'growth',
      stripePriceId: 'price_growth',
      monthlyPriceSek: 1499,
      includedSmsCredits: 1000,
    });
    expect(catalog.plans.scale).toMatchObject({
      key: 'scale',
      stripePriceId: 'price_scale',
      monthlyPriceSek: 2999,
      includedSmsCredits: 3000,
    });
  });

  it('maps credit packs to configured Stripe price IDs', () => {
    const catalog = getStripeBillingCatalog(catalogBindings);

    expect(catalog.creditPacks.credits_500).toMatchObject({
      key: 'credits_500',
      stripePriceId: 'price_credits_500',
      priceSek: 595,
      smsCredits: 500,
    });
    expect(catalog.creditPacks.credits_1500).toMatchObject({
      key: 'credits_1500',
      stripePriceId: 'price_credits_1500',
      priceSek: 1650,
      smsCredits: 1500,
    });
    expect(catalog.creditPacks.credits_5000).toMatchObject({
      key: 'credits_5000',
      stripePriceId: 'price_credits_5000',
      priceSek: 5000,
      smsCredits: 5000,
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
