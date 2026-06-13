import { useTranslations } from 'next-intl';
import { LoadingState } from '@/components/loading-state';
import { cn } from '@/lib/utils';

export function AppPageLoading({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const t = useTranslations('Common');
  const resolvedLabel = label ?? t('loading');

  return (
    <main
      id="main-content"
      aria-busy="true"
      aria-label={t('loadingPage')}
      className="flex flex-1 items-start bg-background"
    >
      <section
        className={cn(
          'mx-auto flex min-h-[360px] w-full max-w-6xl items-center justify-center px-5 py-6 sm:px-8 lg:px-10',
          className,
        )}
      >
        <LoadingState label={resolvedLabel} />
      </section>
    </main>
  );
}
