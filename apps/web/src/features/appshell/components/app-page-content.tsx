import type { ComponentProps, ReactNode } from 'react';
import { Item, ItemGroup } from '@/components/ui/item';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function AppPageContent({
  className,
  ...props
}: ComponentProps<typeof ItemGroup>) {
  return <ItemGroup className={cn('gap-5', className)} {...props} />;
}

export function AppPageItem({
  className,
  ...props
}: ComponentProps<typeof Item>) {
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

export function AppPageSection({
  actions,
  children,
  className,
  description,
  framed = true,
  id,
  itemClassName,
  title,
}: {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  framed?: boolean;
  id?: string;
  itemClassName?: string;
  title: ReactNode;
}) {
  return (
    <section className={cn('grid gap-3', className)} id={id}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid min-w-0 gap-1.5">
          <h2 className={textStyles.itemTitle}>{title}</h2>
          {description ? (
            <p className={cn('max-w-2xl', textStyles.mutedBody)}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </header>
      {children && framed ? (
        <AppPageItem className={itemClassName}>{children}</AppPageItem>
      ) : children ? (
        <div className={cn('grid gap-4', itemClassName)}>{children}</div>
      ) : null}
    </section>
  );
}
