export function positiveSmsSegmentCount(
  value: number | string | null | undefined,
) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function resolvedOutboundSmsSegments({
  estimatedSegments,
  providerSegments,
}: {
  estimatedSegments: number;
  providerSegments: number | null;
}) {
  return positiveSmsSegmentCount(providerSegments) ?? estimatedSegments;
}
