export function formatBillingDate(value: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatCreditCount(value: number) {
  return new Intl.NumberFormat('sv-SE').format(value);
}

export function formatSek(value: number) {
  return new Intl.NumberFormat('sv-SE', {
    currency: 'SEK',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export function formatUnitSek(value: number) {
  return new Intl.NumberFormat('sv-SE', {
    currency: 'SEK',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}
