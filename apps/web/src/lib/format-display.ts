import { formatMinorCurrencyAmount } from '@retaino/shared';

const numberFormatter = new Intl.NumberFormat(undefined);

export function formatDisplayNumber(value: number) {
  return numberFormatter.format(finiteDisplayNumber(value));
}

export function formatDisplayMinorCurrency(
  value: number | null,
  currency: string,
) {
  return formatMinorCurrencyAmount(finiteDisplayNumber(value ?? 0), currency);
}

function finiteDisplayNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}
