import type { ReactNode } from 'react';
import { ItemDescription, ItemTitle } from '@/components/ui/item';

export function EmptyState({
  action,
  description = 'No rows to show.',
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="py-6">
      <ItemTitle>{title}</ItemTitle>
      <ItemDescription className="mt-1">{description}</ItemDescription>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
