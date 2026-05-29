import type { ReactNode } from 'react';
import {
  Check,
  CircleAlert,
  CircleDot,
  Info,
  TriangleAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusBadgeTone =
  | 'amber'
  | 'blue'
  | 'gray'
  | 'green'
  | 'primary'
  | 'red';

const toneIconClasses: Record<StatusBadgeTone, string> = {
  amber: 'text-amber-500',
  blue: 'text-sky-500',
  gray: 'text-muted-foreground',
  green: 'text-emerald-500',
  primary: 'text-primary',
  red: 'text-rose-500',
};

export function StatusBadge({
  className,
  icon,
  label,
  showIcon = true,
  tone,
}: {
  className?: string;
  icon?: ReactNode;
  label: string;
  showIcon?: boolean;
  tone: StatusBadgeTone;
}) {
  return (
    <Badge
      className={cn(
        'inline-flex items-center border-border bg-background px-2.5 text-muted-foreground shadow-none',
        showIcon && 'gap-1.5',
        className,
      )}
      variant="outline"
    >
      {showIcon ? (
        <span className={cn('inline-flex shrink-0', toneIconClasses[tone])}>
          {icon ?? <StatusBadgeIcon tone={tone} />}
        </span>
      ) : null}
      {label}
    </Badge>
  );
}

function StatusBadgeIcon({ tone }: { tone: StatusBadgeTone }) {
  if (tone === 'green') {
    return (
      <span className="inline-flex size-3 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check aria-hidden="true" className="size-2" strokeWidth={3} />
      </span>
    );
  }

  if (tone === 'red') {
    return <CircleAlert aria-hidden="true" className="size-3" />;
  }

  if (tone === 'amber') {
    return <TriangleAlert aria-hidden="true" className="size-3" />;
  }

  if (tone === 'blue') {
    return <Info aria-hidden="true" className="size-3" />;
  }

  return <CircleDot aria-hidden="true" className="size-3" />;
}
