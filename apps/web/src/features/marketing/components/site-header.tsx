import { Show } from '@clerk/nextjs';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

export function SiteHeader() {
  const t = useTranslations('Chrome');

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background px-3 sm:px-5">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-3 text-foreground sm:px-4">
        <Link
          aria-label={t('homeLabel')}
          className="flex items-center text-foreground"
          href={routes.home}
        >
          <Image
            alt=""
            aria-hidden="true"
            className="size-5"
            height={20}
            priority
            src="/brand/icons/retaino-icon-transparent.svg"
            width={20}
          />
        </Link>

        <div className="flex min-h-9 items-center justify-end gap-1.5">
          <Show when="signed-out">
            <Button
              asChild
              className="hidden sm:inline-flex"
              size="sm"
              variant="ghost"
            >
              <Link href={routes.signIn} prefetch={false}>
                {t('signIn')}
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
            >
              <Link href={routes.signIn} prefetch={false}>
                {t('startReactivation')}
              </Link>
            </Button>
          </Show>

          <Show when="signed-in">
            <Button
              asChild
              size="sm"
            >
              <Link href={routes.app} prefetch={false}>
                {t('goToApp')}
              </Link>
            </Button>
          </Show>
        </div>
      </div>
    </header>
  );
}
