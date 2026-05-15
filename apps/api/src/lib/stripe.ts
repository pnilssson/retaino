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
    secretKey: getStripeSecretKey(bindings),
    webhookSecret: getStripeWebhookSecret(bindings),
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
  return new Stripe(getStripeSecretKey(bindings), {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getStripeWebhookSecret(bindings: StripeConfigBindings) {
  return requiredStripeBinding(
    bindings.STRIPE_WEBHOOK_SECRET,
    'STRIPE_WEBHOOK_SECRET',
  );
}

function getStripeSecretKey(bindings: StripeConfigBindings) {
  return requiredStripeBinding(bindings.STRIPE_SECRET_KEY, 'STRIPE_SECRET_KEY');
}

function requiredStripeBinding(value: string | undefined, name: string) {
  const input = value?.trim();

  if (!input) {
    throw new Error(`${name} is required.`);
  }

  return input;
}
