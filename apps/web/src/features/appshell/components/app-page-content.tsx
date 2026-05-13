import type { ComponentProps } from 'react';
import { Item, ItemGroup } from '@/components/ui/item';
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
