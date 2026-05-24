"use client";

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export type SearchableComboboxOption<TValue = string> = {
  description?: ReactNode;
  key: string;
  label: ReactNode;
  searchText: string;
  value: TValue;
};

export function SearchableCombobox<TValue = string>({
  'aria-invalid': ariaInvalid,
  clearQueryOnClose = true,
  disabled,
  displayValue,
  emptyText,
  id,
  isLoading = false,
  loadingText = 'Searching...',
  name,
  onBlur,
  onOpenChange,
  onQueryChange,
  onSelect,
  open,
  options,
  placeholder,
  query,
  searchPlaceholder,
  selectedKey,
}: {
  'aria-invalid'?: boolean;
  clearQueryOnClose?: boolean;
  disabled?: boolean;
  displayValue?: ReactNode;
  emptyText: string;
  id?: string;
  isLoading?: boolean;
  loadingText?: string;
  name?: string;
  onBlur?: () => void;
  onOpenChange?: (open: boolean) => void;
  onQueryChange?: (query: string) => void;
  onSelect: (option: SearchableComboboxOption<TValue>) => void;
  open?: boolean;
  options: Array<SearchableComboboxOption<TValue>>;
  placeholder: string;
  query?: string;
  searchPlaceholder: string;
  selectedKey?: string | null;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState('');
  const currentOpen = open ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);

    if (!nextOpen && clearQueryOnClose) {
      setQuery('');
      onBlur?.();
      return;
    }

    if (!nextOpen) {
      onBlur?.();
    }
  };
  const currentQuery = query ?? internalQuery;
  const setQuery = (nextQuery: string) => {
    if (query === undefined) {
      setInternalQuery(nextQuery);
    }

    onQueryChange?.(nextQuery);
  };
  const normalizedQuery = currentQuery.trim().toLowerCase();
  const filtered = normalizedQuery
    ? options.filter((option) =>
        option.searchText.toLowerCase().includes(normalizedQuery),
      )
    : options;
  const visibleValue = displayValue ?? placeholder;
  const hasValue = Boolean(displayValue);

  return (
    <Popover
      onOpenChange={setOpen}
      open={currentOpen}
    >
      <PopoverTrigger asChild>
        <Button
          aria-expanded={currentOpen}
          aria-invalid={ariaInvalid}
          className="h-8 min-w-0 w-full justify-between"
          disabled={disabled}
          id={id}
          name={name}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span
            className={cn(
              'min-w-0 truncate',
              !hasValue && 'text-muted-foreground',
            )}
          >
            {visibleValue}
          </span>
          <ChevronsUpDown
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2">
        <Input
          aria-label={searchPlaceholder}
          autoComplete="off"
          className="mb-2"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          value={currentQuery}
        />
        <div className="max-h-64 overflow-y-auto" role="listbox">
          {isLoading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {loadingText}
            </p>
          ) : filtered.length > 0 ? (
            filtered.map((option) => {
              const selected = option.key === selectedKey;

              return (
                <button
                  aria-selected={selected}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                    selected && 'bg-accent/60',
                  )}
                  key={option.key}
                  onClick={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate', textStyles.itemTitle)}>
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className={cn('block truncate', textStyles.meta)}>
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  <Check
                    aria-hidden="true"
                    className={cn(
                      'size-4 shrink-0',
                      selected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </button>
              );
            })
          ) : (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {emptyText}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
