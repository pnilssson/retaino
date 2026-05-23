import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function EmptyState({
  action,
  description,
  icon: Icon,
  title,
  variant = 'section',
}: {
  action?: ReactNode;
  description: ReactNode;
  icon?: LucideIcon;
  title: string;
  variant?: 'page' | 'section';
}) {
  return (
    <div
      className={cn(
        'grid justify-items-center text-center',
        variant === 'page'
          ? 'min-h-[42vh] content-center gap-4 px-4 py-12'
          : 'gap-3 py-6',
      )}
    >
      {Icon ? (
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon aria-hidden className="size-5" />
        </div>
      ) : null}
      <div className="grid max-w-md gap-1">
        <h2 className={textStyles.sectionTitle}>{title}</h2>
        <p className={textStyles.mutedBody}>{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
