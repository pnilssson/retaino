import type { FunnelGradientStop } from './funnel-chart';

export const funnelPalette = [
  'var(--chart-5)',
  'var(--chart-4)',
  'var(--chart-3)',
  'var(--chart-2)',
  'var(--chart-1)',
] as const;

const fallbackFunnelColor = 'var(--chart-5)';

export function funnelStageGradient(
  index: number,
  total: number,
): FunnelGradientStop[] {
  const from = funnelPaletteColor(index, total);
  const to = funnelPaletteColor(index + 1, total);

  return [
    { color: from, offset: '0%' },
    { color: to, offset: '100%' },
  ];
}

function funnelPaletteColor(index: number, total: number) {
  if (total <= 1) {
    return funnelPalette[0] ?? fallbackFunnelColor;
  }

  const paletteIndex =
    total <= funnelPalette.length
      ? index
      : Math.round(
          (index / Math.max(total - 1, 1)) * (funnelPalette.length - 1),
        );

  return funnelPalette[
    Math.min(Math.max(paletteIndex, 0), funnelPalette.length - 1)
  ] ?? fallbackFunnelColor;
}
