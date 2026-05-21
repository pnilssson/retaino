"use client";

import { useState, type ReactNode } from 'react';
import type { SmsSenderCountriesResponse } from '@retaino/shared/contracts';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type SenderCountry = SmsSenderCountriesResponse['countries'][number];

export function SenderCountryCombobox({
  countries,
  disabled,
  id,
  onChange,
  value,
}: {
  countries: SenderCountry[];
  disabled?: boolean;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected =
    countries.find((country) => country.countryCode === value)?.label ??
    'Choose country';
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? countries.filter((country) =>
        [country.countryCode, country.label].some((candidate) =>
          candidate.toLowerCase().includes(normalizedQuery),
        ),
      )
    : countries;

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          setQuery('');
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="h-8 w-full justify-between"
          disabled={disabled}
          id={id}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className="truncate">{selected}</span>
          <ChevronsUpDown aria-hidden="true" data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2">
        <Input
          aria-label="Search sender countries"
          autoComplete="off"
          className="mb-2"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search country"
          value={query}
        />
        <div className="max-h-64 overflow-y-auto" role="listbox">
          {filtered.length > 0 ? (
            filtered.map((country) => (
              <button
                aria-selected={country.countryCode === value}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                  country.countryCode === value && 'bg-accent/60',
                )}
                key={country.countryCode}
                onClick={() => {
                  onChange(country.countryCode);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="min-w-0 flex-1 truncate">{country.label}</span>
                <span className="shrink-0 text-muted-foreground">
                  {country.countryCode}
                </span>
                <Check
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0',
                    country.countryCode === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            ))
          ) : (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No countries found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SenderSelect({
  children,
  disabled,
  id,
  label,
  onValueChange,
  placeholder,
  value,
}: {
  children: ReactNode;
  disabled: boolean;
  id: string;
  label: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        disabled={disabled}
        onValueChange={onValueChange}
        value={value || undefined}
      >
        <SelectTrigger aria-label={label} className="w-full" id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
