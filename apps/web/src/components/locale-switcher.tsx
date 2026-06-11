"use client";

import { Check, Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import type { ComponentProps } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const localeOptions = ['sv', 'en'] as const;

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
  const href = query ? `${pathname}?${query}` : pathname;

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
        {localeOptions.map((option) => (
          <DropdownMenuItem asChild key={option}>
            <Link href={href} locale={option}>
              <Check
                aria-hidden="true"
                className={cn(option === locale ? 'opacity-100' : 'opacity-0')}
              />
              {t(option)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
