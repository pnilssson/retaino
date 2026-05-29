export const textStyles = {
  brand: 'text-base tracking-tight',
  body: 'text-sm leading-6 text-foreground',
  displayTitle:
    'text-[2.15rem] leading-[1.06] tracking-normal text-foreground sm:text-5xl lg:text-[3.05rem]',
  error: 'text-sm leading-5 text-destructive',
  itemTitle: 'text-sm leading-snug font-medium',
  legalProse:
    'text-[15px] leading-7 text-muted-foreground [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground [&_h1]:hidden [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:leading-8 [&_h2]:text-foreground [&_h3]:pt-2 [&_h3]:text-base [&_h3]:leading-7 [&_h3]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground',
  meta: 'text-xs leading-5 text-muted-foreground',
  mutedBody: 'text-sm leading-6 text-muted-foreground',
  numeric: 'text-2xl font-semibold tracking-normal tabular-nums',
  numericInline: 'text-sm leading-snug font-medium tabular-nums',
  pageTitle: 'text-2xl leading-tight font-medium tracking-normal sm:text-3xl',
  sectionTitle: 'text-base font-semibold',
} as const;
