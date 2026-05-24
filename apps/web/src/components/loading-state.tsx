import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export function LoadingState({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        className,
      )}
      role="status"
    >
      <Spinner aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
