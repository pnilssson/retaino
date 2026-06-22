import type { ReactNode } from 'react';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

type AppPageHeaderProps = {
  actions?: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
};

export function AppPageHeader({
  actions,
  badge,
  description,
  title,
}: AppPageHeaderProps) {
  return (
    <header className="grid gap-3">
      {badge ? (
        <div className="flex flex-wrap items-center gap-2">
          {badge}
        </div>
      ) : null}
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn('truncate', textStyles.h2)}>
            {title}
          </h1>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {description ? (
        <p className={cn('max-w-2xl', textStyles.mutedP)}>
          {description}
        </p>
      ) : null}
    </header>
  );
}
