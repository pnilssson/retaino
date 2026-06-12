import { useTranslations } from 'next-intl';
import { StatusBadge } from '@/components/status-badge';

export function BlockedStatusBadge({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const t = useTranslations('Common');

  return <StatusBadge className={className} label={label ?? t('blocked')} tone="red" />;
}
