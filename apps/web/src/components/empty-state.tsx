import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Item } from '@/components/ui/item';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function EmptyState({
  action,
  className,
  description,
  framed = false,
  icon: Icon,
  title,
  variant = 'section',
}: {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  framed?: boolean;
  icon?: LucideIcon;
  title: string;
  variant?: 'page' | 'section';
}) {
  const content = (
    <div
      className={cn(
        'grid justify-items-center text-center',
        variant === 'page'
          ? 'min-h-[42vh] content-center gap-4 px-4 py-12'
          : 'gap-3 py-6',
        !framed && className,
      )}
    >
      {Icon ? (
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon aria-hidden className="size-5" />
        </div>
      ) : null}
      <div className="grid max-w-md gap-1">
        <h2 className={textStyles.h3}>{title}</h2>
        <p className={textStyles.mutedP}>{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );

  if (!framed) {
    return content;
  }

  return (
    <Item
      asChild
      className={cn(
        'grid items-stretch gap-5 px-5 py-5',
        className,
      )}
    >
      <section>{content}</section>
    </Item>
  );
}
