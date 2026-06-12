"use client";

import { Check, Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  usePathname,
  useSearchParams,
} from 'next/navigation';
import type { ComponentProps } from 'react';
import { LOCALES } from '@retaino/shared';
import { Link } from '@/i18n/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LocaleSwitcher({
  className,
  variant = 'ghost',
}: {
  className?: string;
  variant?: ComponentProps<typeof Button>['variant'];
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('Locale');
  const query = searchParams.toString();
  const unlocalizedPathname = removeLocalePrefix(pathname);
  const href = query ? `${unlocalizedPathname}?${query}` : unlocalizedPathname;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('switcherLabel')}
          className={cn('px-2', className)}
          size="sm"
          variant={variant}
        >
          <Globe aria-hidden="true" />
          <span className="sr-only">{t('switcherLabel')}</span>
          <span aria-hidden="true" className="uppercase">
            {locale}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((option) => {
          const isCurrentLocale = option === locale;

          return (
            <DropdownMenuItem
              aria-current={isCurrentLocale ? 'true' : undefined}
              asChild={!isCurrentLocale}
              disabled={isCurrentLocale}
              key={option}
            >
              {isCurrentLocale ? (
                <span>
                  <Check aria-hidden="true" className="opacity-100" />
                  {t(option)}
                </span>
              ) : (
                <Link href={href} locale={option}>
                  <Check aria-hidden="true" className="opacity-0" />
                  {t(option)}
                </Link>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function removeLocalePrefix(pathname: string) {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) {
      return '/';
    }

    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }

  return pathname;
}
