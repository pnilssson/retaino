import type { ReactNode } from 'react';

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
              <p className="text-sm text-muted-foreground">{eyebrow}</p>
            ) : null}
            {badge}
          </div>
        ) : null}
        <h1 className="mt-2 truncate text-2xl leading-tight tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
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
