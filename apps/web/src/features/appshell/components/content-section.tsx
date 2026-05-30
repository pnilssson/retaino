import type { ReactNode } from 'react';
import { Item } from '@/components/ui/item';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function ContentHeading({
  actions,
  className,
  description,
  title,
  titleId,
}: {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  title: ReactNode;
  titleId?: string;
}) {
  return (
    <header
      className={cn('grid gap-1.5', className)}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={textStyles.itemTitle} id={titleId}>
            {title}
          </h2>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {description ? (
        <p className={cn('max-w-2xl', textStyles.mutedBody)}>
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function ContentSection({
  actions,
  asChild = false,
  children,
  className,
  contentClassName,
  description,
  framed = true,
  id,
  title,
  titleId,
}: {
  actions?: ReactNode;
  asChild?: boolean;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  framed?: boolean;
  id?: string;
  title?: ReactNode;
  titleId?: string;
}) {
  const hasHeading = Boolean(title || description || actions);

  if (!hasHeading) {
    if (!children) {
      return null;
    }

    if (framed) {
      return (
        <ContentPanel
          asChild={asChild}
          className={cn(className, contentClassName)}
          id={id}
        >
          {children}
        </ContentPanel>
      );
    }

    return (
      <div className={cn('grid gap-4', className, contentClassName)} id={id}>
        {children}
      </div>
    );
  }

  return (
    <section className={cn('grid gap-3', className)} id={id}>
      {title ? (
        <ContentHeading
          actions={actions}
          description={description}
          title={title}
          titleId={titleId}
        />
      ) : null}
      {children && framed ? (
        <ContentPanel asChild={asChild} className={contentClassName}>
          {children}
        </ContentPanel>
      ) : children ? (
        <div className={cn('grid gap-4', contentClassName)}>{children}</div>
      ) : null}
    </section>
  );
}

function ContentPanel({
  className,
  ...props
}: React.ComponentProps<typeof Item>) {
  return (
    <Item
      className={cn(
        'grid items-stretch gap-5 border-border bg-card px-5 py-5',
        className,
      )}
      {...props}
    />
  );
}
