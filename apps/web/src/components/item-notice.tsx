import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { cn } from '@/lib/utils';

type ItemNoticeVariant = 'info' | 'success' | 'warning' | 'error';

export function ItemNotice({
  action,
  description,
  title,
  variant = 'info',
}: {
  action?: ReactNode;
  description: ReactNode;
  title: ReactNode;
  variant?: ItemNoticeVariant;
}) {
  return (
    <div
      className="flex items-start gap-3"
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {noticeIcon(variant)}
      <div className="grid gap-1">
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}

function noticeIcon(variant: ItemNoticeVariant) {
  if (variant === 'success') {
    return (
      <CheckCircle2
        aria-hidden="true"
        className={cn('mt-0.5 size-4 shrink-0', noticeIconClassName(variant))}
      />
    );
  }

  if (variant === 'warning') {
    return (
      <TriangleAlert
        aria-hidden="true"
        className={cn('mt-0.5 size-4 shrink-0', noticeIconClassName(variant))}
      />
    );
  }

  if (variant === 'error') {
    return (
      <AlertCircle
        aria-hidden="true"
        className={cn('mt-0.5 size-4 shrink-0', noticeIconClassName(variant))}
      />
    );
  }

  return (
    <Info
      aria-hidden="true"
      className={cn('mt-0.5 size-4 shrink-0', noticeIconClassName(variant))}
    />
  );
}

function noticeIconClassName(variant: ItemNoticeVariant) {
  if (variant === 'success') {
    return 'text-emerald-600 dark:text-emerald-400';
  }

  if (variant === 'warning') {
    return 'text-amber-600 dark:text-amber-400';
  }

  if (variant === 'error') {
    return 'text-destructive';
  }

  return 'text-muted-foreground';
}
