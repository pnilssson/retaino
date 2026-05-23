"use client";

import { Check, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  currencyCodeSchema,
  formatCurrencyLabel,
  getSupportedCurrencyCodes,
} from '@retaino/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function CurrencyCombobox({
  'aria-invalid': ariaInvalid,
  disabled,
  id,
  locale = 'en',
  name,
  onBlur,
  onChange,
  value,
}: {
  'aria-invalid'?: boolean;
  disabled?: boolean;
  id?: string;
  locale?: string;
  name?: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const currencies = useMemo(
    () =>
      getSupportedCurrencyCodes().map((code) => ({
        code,
        label: formatCurrencyLabel(code, locale),
      })),
    [locale],
  );
  const selected = currencyCodeSchema.safeParse(value).success
    ? formatCurrencyLabel(value, locale)
    : 'Choose currency';
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? currencies.filter((currency) =>
        [currency.code, currency.label].some((candidate) =>
          candidate.toLowerCase().includes(normalizedQuery),
        ),
      )
    : currencies;

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          setQuery('');
          onBlur?.();
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          className="h-8 w-full justify-between"
          disabled={disabled}
          id={id}
          name={name}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className="truncate">{selected}</span>
          <ChevronsUpDown
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2">
        <Input
          aria-label="Search currencies"
          autoComplete="off"
          className="mb-2"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search currency or SEK"
          value={query}
        />
        <div className="max-h-64 overflow-y-auto" role="listbox">
          {filtered.length > 0 ? (
            filtered.map((currency) => (
              <button
                aria-selected={currency.code === value}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                  currency.code === value && 'bg-accent/60',
                )}
                key={currency.code}
                onClick={() => {
                  onChange(currency.code);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="min-w-0 flex-1 truncate">
                  {currency.label}
                </span>
                <Check
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0',
                    currency.code === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            ))
          ) : (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No currencies found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
