import { Show } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
        <Link
          aria-label="Retaino home"
          className={`flex items-center gap-2 ${textStyles.brand}`}
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
          retaino.
        </Link>

        <div className="flex min-h-10 items-center justify-end gap-2">
          <Show when="signed-out">
            <Button asChild className="hidden px-3 sm:inline-flex" variant="ghost">
              <Link href={routes.signIn} prefetch={false}>
                Sign in
              </Link>
            </Button>
            <Button asChild>
              <Link href={routes.signIn} prefetch={false}>
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start reactivation</span>
              </Link>
            </Button>
          </Show>

          <Show when="signed-in">
            <Button asChild>
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
