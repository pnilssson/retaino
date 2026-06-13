"use client";

import type { SmsSenderCountriesResponse } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@/components/searchable-combobox';

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
  const t = useTranslations('Campaigns');
  const options: Array<SearchableComboboxOption<string>> = countries.map(
    (country) => ({
      description: country.countryCode,
      key: country.countryCode,
      label: country.label,
      searchText: `${country.countryCode} ${country.label}`,
      value: country.countryCode,
    }),
  );
  const selected =
    countries.find((country) => country.countryCode === value)?.label ??
    t('chooseCountry');

  return (
    <SearchableCombobox
      disabled={disabled}
      displayValue={selected}
      emptyText={t('noCountriesFound')}
      id={id}
      onSelect={(option) => onChange(option.value)}
      options={options}
      placeholder={t('chooseCountry')}
      searchPlaceholder={t('searchSenderCountries')}
      selectedKey={value}
    />
  );
}
