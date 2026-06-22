"use client";

import { useTranslations } from 'next-intl';
import { Spinner } from '@/components/ui/spinner';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function LoadingState({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const t = useTranslations('Common');
  const resolvedLabel = label ?? t('loading');

  return (
    <div
      aria-busy="true"
      aria-label={resolvedLabel}
      className={cn(
        'flex w-full items-center justify-center gap-2 text-center',
        textStyles.mutedP,
        className,
      )}
      role="status"
    >
      <Spinner aria-hidden="true" />
      <span>{resolvedLabel}</span>
    </div>
  );
}
