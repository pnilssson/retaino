import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function MetricSummaryEntry({
  className,
  detail,
  detailIcon,
  icon: Icon,
  iconClassName,
  label,
  value,
}: {
  className?: string;
  detail?: ReactNode;
  detailIcon?: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  label: ReactNode;
  value: ReactNode;
}) {
  const hasValue = value !== null && value !== undefined && value !== false;
  const hasDetail = detail !== null && detail !== undefined && detail !== false;

  return (
    <div
      className={cn(
        'flex min-h-20 items-center justify-between gap-4 border-t border-border py-3',
        className,
      )}
    >
      <dt className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <span
            className={cn(
              'flex size-4 shrink-0 items-center justify-center bg-transparent',
              iconClassName ?? 'bg-muted text-muted-foreground',
              'bg-transparent',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </span>
        ) : null}
        <span className={cn('truncate', textStyles.h3)}>
          {label}
        </span>
      </dt>
      {hasValue ? (
        <dd className={cn('shrink-0 text-right', textStyles.smallNumber)}>
          <span>{value}</span>
          {hasDetail ? (
            <span className="ml-1 inline-flex items-center gap-1 align-baseline">
              (
              {detailIcon}
              <span>{detail}</span>
              )
            </span>
          ) : null}
        </dd>
      ) : null}
    </div>
  );
}
