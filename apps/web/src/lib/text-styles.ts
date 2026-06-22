export const textStyles = {
  error: 'text-sm leading-5 text-destructive',
  h1:
    'text-[2.15rem] leading-[1.06] tracking-normal text-foreground sm:text-5xl lg:text-[3.05rem]',
  h2: 'text-2xl leading-tight font-normal tracking-normal sm:text-3xl',
  h3: 'text-sm leading-snug font-normal',
  chartCenterLabel:
    'max-w-full truncate text-[clamp(0.625rem,9cqw,0.75rem)] leading-tight text-chart-label',
  chartCenterValue:
    'text-foreground text-[clamp(0.875rem,22cqw,2rem)] leading-none font-bold tabular-nums',
  lead: 'text-base leading-7 font-normal tracking-normal',
  mutedP: 'text-sm leading-6 text-muted-foreground',
  p: 'text-sm leading-6 text-foreground',
  small: 'text-xs leading-5 text-muted-foreground',
  smallNumber: 'text-sm leading-snug font-normal tabular-nums',
} as const;
