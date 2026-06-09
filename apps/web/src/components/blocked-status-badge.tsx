import { StatusBadge } from '@/components/status-badge';

export function BlockedStatusBadge({
  className,
  label = 'Blocked',
}: {
  className?: string;
  label?: string;
}) {
  return <StatusBadge className={className} label={label} tone="red" />;
}
