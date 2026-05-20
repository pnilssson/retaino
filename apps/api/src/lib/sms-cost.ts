export function providerCostMinor(cost: string | null) {
  if (!cost) {
    return null;
  }

  const numeric = Number(cost);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.round(numeric * 100);
}
