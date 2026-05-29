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
  return (
    <div
      className={cn(
        'grid min-h-20 content-between gap-2 border-t border-border py-3',
        className,
      )}
    >
      <dt className={cn('flex items-center gap-2', textStyles.itemTitle)}>
        {Icon ? (
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-md',
              iconClassName ?? 'bg-muted text-muted-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </span>
        ) : null}
        {label}
      </dt>
      <dd>
        <div className={textStyles.numeric}>{value}</div>
        {detail ? (
          <div className={cn('mt-1', textStyles.meta)}>
            {detail}
          </div>
        ) : null}
      </dd>
    </div>
  );
}
