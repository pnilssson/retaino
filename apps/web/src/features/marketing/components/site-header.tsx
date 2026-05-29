import { Show } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex h-[3.25rem] w-full max-w-5xl items-center justify-between gap-4 rounded-lg bg-primary px-3 text-primary-foreground shadow-xl shadow-primary/20 ring-1 ring-primary-foreground/10 sm:px-4">
        <Link
          aria-label="Retaino home"
          className="flex items-center text-primary-foreground"
          href={routes.home}
        >
          <Image
            alt=""
            aria-hidden="true"
            className="size-5 brightness-0 invert"
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
              className="hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:inline-flex"
              size="sm"
              variant="ghost"
            >
              <Link href={routes.signIn} prefetch={false}>
                Sign in
              </Link>
            </Button>
            <Button
              asChild
              className="text-foreground hover:text-foreground"
              size="sm"
              variant="outline"
            >
              <Link href={routes.signIn} prefetch={false}>
                Start reactivation
              </Link>
            </Button>
          </Show>

          <Show when="signed-in">
            <Button
              asChild
              className="text-foreground hover:text-foreground"
              size="sm"
              variant="outline"
            >
              <Link href={routes.app} prefetch={false}>
                Go to app
              </Link>
            </Button>
          </Show>
        </div>
      </div>
    </header>
  );
}
