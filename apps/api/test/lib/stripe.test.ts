import { describe, expect, it } from 'vitest';
import {
  STRIPE_API_VERSION,
  createStripeClient,
  getStripeConfig,
} from '../../src/lib/stripe';

const stripeBindings = {
  STRIPE_CANCEL_URL: 'https://retaino.test/app/settings/billing',
  STRIPE_RETURN_URL: 'https://retaino.test/app/settings/billing',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_SUCCESS_URL: 'https://retaino.test/app/settings/billing/success',
  STRIPE_WEBHOOK_SECRET: 'whsec_123',
};

describe('Stripe config', () => {
  it('uses the pinned Stripe API version', () => {
    expect(STRIPE_API_VERSION).toBe('2026-04-22.dahlia');
  });

  it('requires server-side Stripe secrets and URLs', () => {
    expect(() =>
      getStripeConfig({
        ...stripeBindings,
        STRIPE_SECRET_KEY: '',
      }),
    ).toThrow('STRIPE_SECRET_KEY is required.');
    expect(() =>
      getStripeConfig(
        omitStripeBinding(stripeBindings, 'STRIPE_WEBHOOK_SECRET'),
      ),
    ).toThrow('STRIPE_WEBHOOK_SECRET is required.');
  });

  it('defaults Retaino as the per-checkout display name', () => {
    expect(getStripeConfig(stripeBindings).checkoutDisplayName).toBe('Retaino');
  });

  it('prefixes Stripe app redirect URLs with the request locale', () => {
    expect(getStripeConfig(stripeBindings, 'en')).toMatchObject({
      cancelUrl: 'https://retaino.test/en/app/settings/billing',
      returnUrl: 'https://retaino.test/en/app/settings/billing',
      successUrl: 'https://retaino.test/en/app/settings/billing/success',
    });
  });

  it('replaces an existing locale prefix in Stripe app redirect URLs', () => {
    expect(
      getStripeConfig(
        {
          ...stripeBindings,
          STRIPE_CANCEL_URL: 'https://retaino.test/en/app/settings/billing',
          STRIPE_RETURN_URL: 'https://retaino.test/en/app/settings/billing',
          STRIPE_SUCCESS_URL:
            'https://retaino.test/en/app/settings/billing/success',
        },
        'sv',
      ),
    ).toMatchObject({
      cancelUrl: 'https://retaino.test/sv/app/settings/billing',
      returnUrl: 'https://retaino.test/sv/app/settings/billing',
      successUrl: 'https://retaino.test/sv/app/settings/billing/success',
    });
  });

  it('allows overriding the per-checkout display name without changing account branding', () => {
    expect(
      getStripeConfig({
        ...stripeBindings,
        STRIPE_CHECKOUT_DISPLAY_NAME: 'Retaino Sandbox',
      }).checkoutDisplayName,
    ).toBe('Retaino Sandbox');
  });

  it('creates a Stripe client from worker-compatible fetch config', () => {
    const stripe = createStripeClient(stripeBindings);

    expect(stripe).toBeDefined();
  });

  it('creates a Stripe client without checkout-only bindings', () => {
    const stripe = createStripeClient({
      STRIPE_SECRET_KEY: 'sk_test_123',
    });

    expect(stripe).toBeDefined();
  });
});

function omitStripeBinding<
  TKey extends keyof typeof stripeBindings,
>(bindings: typeof stripeBindings, key: TKey) {
  const next = { ...bindings };
  delete next[key];

  return next;
}
