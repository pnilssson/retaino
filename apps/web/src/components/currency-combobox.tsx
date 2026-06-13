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
import { useTranslations } from 'next-intl';

export function CurrencyCombobox({
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
    : t('chooseCurrency');

  return (
    <SearchableCombobox
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      disabled={disabled}
      displayValue={selected}
      emptyText={t('noCurrenciesFound')}
      id={id}
      name={name}
      onBlur={onBlur}
      onSelect={(option) => {
        onChange(option.value);
      }}
      options={currencies}
      placeholder={t('chooseCurrency')}
      searchPlaceholder={t('searchCurrency')}
      selectedKey={value}
    />
  );
}
