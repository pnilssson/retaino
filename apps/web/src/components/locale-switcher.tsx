"use client";

import { buildLocalizedPath, normalizeLocale, type Locale } from '@retaino/shared';
import { Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import type { ComponentProps } from 'react';
import { startTransition, useOptimistic } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const localeOptions: Locale[] = ['sv', 'en'];

export function LocaleSwitcher({
  className,
  variant = 'ghost',
}: {
  className?: string;
  variant?: ComponentProps<typeof Button>['variant'];
}) {
  const t = useTranslations('Locale');
  const { selectedLocale, switchLocale } = useLocaleSwitch();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('switcherLabel')}
          className={cn('min-w-14 justify-center gap-1.5 px-2.5', className)}
          size="sm"
          variant={variant}
        >
          <Globe aria-hidden="true" />
          <span className="sr-only">{t('switcherLabel')}</span>
          <span aria-hidden="true" className="uppercase">
            {selectedLocale}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={selectedLocale}>
          {localeOptions.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              onSelect={() => switchLocale(option)}
              value={option}
            >
              {t(option)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LocaleMenuItem() {
  const { selectedLocale, switchLocale } = useLocaleSwitch();
  const nextLocale = selectedLocale === 'sv' ? 'en' : 'sv';

  return (
    <DropdownMenuItem onSelect={() => switchLocale(nextLocale)}>
      <Globe aria-hidden="true" strokeWidth={1.5} />
      <span className="uppercase">{selectedLocale}</span>
    </DropdownMenuItem>
  );
}

function useLocaleSwitch() {
  const currentLocale = normalizeLocale(useLocale());
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedLocale, setSelectedLocale] = useOptimistic(currentLocale);

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === selectedLocale) {
      return;
    }

    const query = searchParams.toString();
    const currentPath = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      setSelectedLocale(nextLocale);
      router.push(buildLocalizedPath(currentPath, nextLocale));
    });
  }

  return {
    selectedLocale,
    switchLocale,
  };
}
