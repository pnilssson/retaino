import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from 'lucide-react';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export type TableSortDirection = 'asc' | 'desc';

export type SortableTableHeaderMeta = {
  ariaSort?: 'ascending' | 'descending';
};

export function SortableTableHeader({
  active,
  defaultDirection = 'asc',
  direction,
  label,
  onSort,
}: {
  active: boolean;
  defaultDirection?: TableSortDirection;
  direction: TableSortDirection;
  label: string;
  onSort: () => void;
}) {
  const nextDirection: TableSortDirection =
    active ? (direction === 'asc' ? 'desc' : 'asc') : defaultDirection;
  const Icon = active
    ? direction === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <button
      aria-label={`Sort by ${label.toLowerCase()} ${nextDirection === 'asc' ? 'ascending' : 'descending'}`}
      className={cn(
        '-ml-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        textStyles.itemTitle,
      )}
      onClick={onSort}
      type="button"
    >
      <span>{label}</span>
      <Icon
        aria-hidden="true"
        className={cn('size-3.5', active ? 'text-foreground' : 'opacity-55')}
        strokeWidth={1.75}
      />
    </button>
  );
}

export function sortableHeaderAriaSort({
  active,
  direction,
}: {
  active: boolean;
  direction: TableSortDirection;
}): SortableTableHeaderMeta {
  return active
    ? { ariaSort: direction === 'asc' ? 'ascending' : 'descending' }
    : {};
}
