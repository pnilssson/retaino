import Stripe from 'stripe';

export const STRIPE_API_VERSION = '2026-04-22.dahlia';

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  successUrl: string;
  cancelUrl: string;
  returnUrl: string;
  checkoutDisplayName: string;
};

export type StripeConfigBindings = {
  STRIPE_CANCEL_URL?: string;
  STRIPE_CHECKOUT_DISPLAY_NAME?: string;
  STRIPE_RETURN_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_SUCCESS_URL?: string;
  STRIPE_WEBHOOK_SECRET?: string;
};

export function getStripeConfig(bindings: StripeConfigBindings): StripeConfig {
  return {
    secretKey: requiredStripeBinding(bindings.STRIPE_SECRET_KEY, 'STRIPE_SECRET_KEY'),
    webhookSecret: requiredStripeBinding(
      bindings.STRIPE_WEBHOOK_SECRET,
      'STRIPE_WEBHOOK_SECRET',
    ),
    successUrl: requiredStripeBinding(
      bindings.STRIPE_SUCCESS_URL,
      'STRIPE_SUCCESS_URL',
    ),
    cancelUrl: requiredStripeBinding(bindings.STRIPE_CANCEL_URL, 'STRIPE_CANCEL_URL'),
    returnUrl: requiredStripeBinding(bindings.STRIPE_RETURN_URL, 'STRIPE_RETURN_URL'),
    checkoutDisplayName:
      bindings.STRIPE_CHECKOUT_DISPLAY_NAME?.trim() || 'Retaino',
  };
}

export function createStripeClient(bindings: StripeConfigBindings) {
  const config = getStripeConfig(bindings);

  return new Stripe(config.secretKey, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function requiredStripeBinding(value: string | undefined, name: string) {
  const input = value?.trim();

  if (!input) {
    throw new Error(`${name} is required.`);
  }

  return input;
}
