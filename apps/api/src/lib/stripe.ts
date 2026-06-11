import Stripe from 'stripe';
import {
  isLocale,
  normalizeLocale,
} from '@retaino/shared';

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

export function getStripeConfig(
  bindings: StripeConfigBindings,
  locale?: string | null,
): StripeConfig {
  const appLocale = normalizeLocale(locale);

  return {
    secretKey: getStripeSecretKey(bindings),
    webhookSecret: getStripeWebhookSecret(bindings),
    successUrl: localizedStripeUrl(
      bindings.STRIPE_SUCCESS_URL,
      'STRIPE_SUCCESS_URL',
      appLocale,
    ),
    cancelUrl: localizedStripeUrl(
      bindings.STRIPE_CANCEL_URL,
      'STRIPE_CANCEL_URL',
      appLocale,
    ),
    returnUrl: localizedStripeUrl(
      bindings.STRIPE_RETURN_URL,
      'STRIPE_RETURN_URL',
      appLocale,
    ),
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

function localizedStripeUrl(
  value: string | undefined,
  name: string,
  locale: string,
) {
  const rawUrl = requiredStripeBinding(value, name);
  const url = new URL(rawUrl);
  const segments = url.pathname.split('/').filter(Boolean);
  const [firstSegment, ...restSegments] = segments;
  const nextSegments = isLocale(firstSegment)
    ? [locale, ...restSegments]
    : [locale, ...segments];

  url.pathname = `/${nextSegments.join('/')}`;

  return url.toString();
}
