"use client";

import { useMemo } from 'react';
import {
  currencyCodeSchema,
  formatCurrencyLabel,
  getSupportedCurrencyCodes,
} from '@retaino/shared';
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@/components/searchable-combobox';

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
  const currencies: Array<SearchableComboboxOption<string>> = useMemo(
    () =>
      getSupportedCurrencyCodes().map((code) => ({
        label: formatCurrencyLabel(code, locale),
        key: code,
        searchText: `${code} ${formatCurrencyLabel(code, locale)}`,
        value: code,
      })),
    [locale],
  );
  const selected = currencyCodeSchema.safeParse(value).success
    ? formatCurrencyLabel(value, locale)
    : 'Choose currency';

  return (
    <SearchableCombobox
      aria-invalid={ariaInvalid}
      disabled={disabled}
      displayValue={selected}
      emptyText="No currencies found."
      id={id}
      name={name}
      onBlur={onBlur}
      onSelect={(option) => {
        onChange(option.value);
      }}
      options={currencies}
      placeholder="Choose currency"
      searchPlaceholder="Search currency or SEK"
      selectedKey={value}
    />
  );
}
