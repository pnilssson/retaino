"use client";

import { useMemo } from 'react';
import {
  formatPhoneCountryLabel,
  getSupportedPhoneCountries,
  isSupportedCountryCode,
} from '@retaino/shared/contracts';
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@/components/searchable-combobox';

export function CountryCombobox({
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
  const countries = useMemo(() => getSupportedPhoneCountries(locale), [locale]);
  const options: Array<SearchableComboboxOption<string>> = useMemo(
    () =>
      countries.map((country) => ({
        description: `+${country.callingCode}`,
        key: country.code,
        label: country.name,
        searchText: [
          country.code,
          country.name,
          `+${country.callingCode}`,
          country.callingCode,
        ].join(' '),
        value: country.code,
      })),
    [countries],
  );
  const selected = isSupportedCountryCode(value)
    ? formatPhoneCountryLabel(value, locale)
    : 'Choose country';

  return (
    <SearchableCombobox
      aria-invalid={ariaInvalid}
      disabled={disabled}
      displayValue={selected}
      emptyText="No countries found."
      id={id}
      name={name}
      onBlur={onBlur}
      onSelect={(option) => {
        onChange(option.value);
      }}
      options={options}
      placeholder="Choose country"
      searchPlaceholder="Search country or +46"
      selectedKey={value}
    />
  );
}
