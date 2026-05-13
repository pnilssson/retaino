import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusBadgeTone = 'amber' | 'blue' | 'gray' | 'green' | 'red';

const toneClasses: Record<StatusBadgeTone, string> = {
  amber:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
  blue:
    'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300',
  gray:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300',
  green:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300',
  red:
    'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300',
};

export function StatusBadge({
  className,
  label,
  tone,
}: {
  className?: string;
  label: string;
  tone: StatusBadgeTone;
}) {
  return (
    <Badge
      className={cn(
        'border px-2.5 font-medium shadow-none',
        toneClasses[tone],
        className,
      )}
      variant="outline"
    >
      {label}
    </Badge>
  );
}
