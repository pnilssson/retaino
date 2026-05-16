import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { ItemDescription, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';

export function ItemNotice({
  action,
  description,
  title,
  tone = 'default',
}: {
  action?: ReactNode;
  description: ReactNode;
  title: ReactNode;
  tone?: 'default' | 'destructive';
}) {
  return (
    <div className="flex items-start gap-3">
      <AlertCircle
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground',
        )}
      />
      <div className="grid gap-1">
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
