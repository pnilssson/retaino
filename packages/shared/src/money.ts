import { z } from 'zod';

const FALLBACK_CURRENCY_CODES = [
  'AUD',
  'CAD',
  'CHF',
  'DKK',
  'EUR',
  'GBP',
  'NOK',
  'SEK',
  'USD',
  'JPY',
] as const;

export const currencyCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{3}$/.test(value) && isSupportedCurrency(value), {
    message: 'Choose a supported currency.',
  });

export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

export type ParseCurrencyAmountResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

export function parseMajorCurrencyAmount(
  value: string,
  currency: string,
): ParseCurrencyAmountResult {
  const normalizedCurrency = currencyCodeSchema.safeParse(currency);

  if (!normalizedCurrency.success) {
    return { ok: false, error: 'Choose a supported currency.' };
  }

  const fractionDigits = getCurrencyFractionDigits(normalizedCurrency.data);
  const normalizedValue = value.trim().replace(/[\s\u00a0]/g, '');

  if (!normalizedValue) {
    return { ok: false, error: 'Enter an amount.' };
  }

  if (normalizedValue.startsWith('-')) {
    return { ok: false, error: 'Enter a positive amount.' };
  }

  if (!/^\d+(?:[,.]\d+)?$/.test(normalizedValue)) {
    return { ok: false, error: 'Enter a valid amount.' };
  }

  const [major = '', fraction = ''] = normalizedValue.replace(',', '.').split('.');

  if (!major || fraction.length > fractionDigits) {
    return { ok: false, error: 'Enter a valid amount.' };
  }

  const paddedFraction = fraction.padEnd(fractionDigits, '0');
  const minorText = `${major}${paddedFraction || ''}`;
  const minor = Number.parseInt(minorText, 10);

  if (!Number.isSafeInteger(minor)) {
    return { ok: false, error: 'Enter a smaller amount.' };
  }

  return { ok: true, value: minor };
}

export function formatMinorCurrencyAmount(
  minorAmount: number,
  currency: string,
  locale?: string,
) {
  const normalizedCurrency = currencyCodeSchema.parse(currency);
  const fractionDigits = getCurrencyFractionDigits(normalizedCurrency);

  return new Intl.NumberFormat(locale, {
    currency: normalizedCurrency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    style: 'currency',
  }).format(minorAmount / 10 ** fractionDigits);
}

export function getSupportedCurrencyCodes() {
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: 'currency') => string[];
    }
  ).supportedValuesOf;

  return supportedValuesOf
    ? supportedValuesOf('currency')
    : [...FALLBACK_CURRENCY_CODES];
}

export function getCurrencyDisplayName(currency: string, locale = 'en') {
  const normalizedCurrency = currencyCodeSchema.parse(currency);

  try {
    return (
      new Intl.DisplayNames([locale], { type: 'currency' }).of(
        normalizedCurrency,
      ) ?? normalizedCurrency
    );
  } catch {
    return normalizedCurrency;
  }
}

export function formatCurrencyLabel(currency: string, locale = 'en') {
  const normalizedCurrency = currencyCodeSchema.parse(currency);
  return `${getCurrencyDisplayName(normalizedCurrency, locale)} (${normalizedCurrency})`;
}

export function getCurrencyFractionDigits(currency: string) {
  return new Intl.NumberFormat(undefined, {
    currency: currencyCodeSchema.parse(currency),
    style: 'currency',
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

function isSupportedCurrency(currency: string) {
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: 'currency') => string[];
    }
  ).supportedValuesOf;

  if (supportedValuesOf) {
    return supportedValuesOf('currency').includes(currency);
  }

  if (FALLBACK_CURRENCY_CODES.includes(currency as never)) {
    return true;
  }

  try {
    new Intl.NumberFormat(undefined, {
      currency,
      style: 'currency',
    });
    return true;
  } catch {
    return false;
  }
}
