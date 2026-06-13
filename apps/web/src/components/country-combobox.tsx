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
import { useTranslations } from 'next-intl';

export function CountryCombobox({
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  disabled,
  id,
  locale = 'en',
  name,
  onBlur,
  onChange,
  value,
}: {
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  disabled?: boolean;
  id?: string;
  locale?: string;
  name?: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  const t = useTranslations('Common');
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
    : t('chooseCountry');

  return (
    <SearchableCombobox
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      disabled={disabled}
      displayValue={selected}
      emptyText={t('noCountriesFound')}
      id={id}
      name={name}
      onBlur={onBlur}
      onSelect={(option) => {
        onChange(option.value);
      }}
      options={options}
      placeholder={t('chooseCountry')}
      searchPlaceholder={t('searchCountry')}
      selectedKey={value}
    />
  );
}
