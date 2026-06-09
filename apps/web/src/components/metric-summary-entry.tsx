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
        'grid min-h-20 content-start gap-2 border-t border-border py-3',
        className,
      )}
    >
      <dt className="flex min-w-0 items-start gap-2">
        {Icon ? (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-md',
              iconClassName ?? 'bg-muted text-muted-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </span>
        ) : null}
        <span className="grid min-w-0 content-center">
          <span className={cn('truncate', textStyles.itemTitle)}>
            {label}
          </span>
          {detail ? (
            <span className={textStyles.meta}>
              {detail}
            </span>
          ) : null}
        </span>
      </dt>
      {hasValue ? (
        <dd className={textStyles.numericInline}>
          {value}
        </dd>
      ) : null}
    </div>
  );
}
