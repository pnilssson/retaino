import { Spinner } from '@/components/ui/spinner';
import { textStyles } from '@/lib/text-styles';
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
        'flex w-full items-center justify-center gap-2 text-center',
        textStyles.mutedBody,
        className,
      )}
      role="status"
    >
      <Spinner aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
