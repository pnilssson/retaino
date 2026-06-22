import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function MetricSummaryEntry({
  className,
  detail,
  icon: Icon,
  iconClassName,
  label,
  value,
}: {
  className?: string;
  detail?: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  label: ReactNode;
  value: ReactNode;
}) {
  const hasValue = value !== null && value !== undefined && value !== false;

  return (
    <div
      className={cn(
        'grid min-h-20 grid-cols-[minmax(0,1fr)_auto] content-center gap-x-4 gap-y-2 border-t border-border py-3',
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
        <dd
          className={cn(
            'row-span-2 self-center justify-self-end text-right',
            textStyles.smallNumber,
          )}
        >
          {value}
        </dd>
      ) : null}
      {detail ? (
        <dd className={cn('col-start-1 min-w-0', textStyles.small)}>
          {detail}
        </dd>
      ) : null}
    </div>
  );
}
