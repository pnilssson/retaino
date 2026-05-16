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
  eyebrow,
  title
}: AppPageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow || badge ? (
          <div className="flex flex-wrap items-center gap-2">
            {eyebrow ? (
              <p className={textStyles.meta}>{eyebrow}</p>
            ) : null}
            {badge}
          </div>
        ) : null}
        <h1 className={cn('mt-2 truncate', textStyles.pageTitle)}>
          {title}
        </h1>
        {description ? (
          <p className={cn('mt-3 max-w-2xl', textStyles.pageDescription)}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
