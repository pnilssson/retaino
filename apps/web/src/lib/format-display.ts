import { formatMinorCurrencyAmount } from '@retaino/shared';
import { getIntlLocale } from './locale-format';

export function formatDisplayNumber(value: number, locale: string) {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(
    finiteDisplayNumber(value),
  );
}

export function formatDisplayMinorCurrency(
  value: number | null,
  currency: string,
  locale: string,
) {
  return formatMinorCurrencyAmount(
    finiteDisplayNumber(value ?? 0),
    currency,
    getIntlLocale(locale),
  );
}

function finiteDisplayNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}
