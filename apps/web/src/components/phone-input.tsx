"use client";

import { CountryCombobox } from '@/components/country-combobox';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';

export function PhoneInput({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  countryCode,
  disabled,
  id,
  name,
  onBlur,
  onChange,
  onCountryChange,
  placeholder = '701234567',
  value,
}: {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  countryCode: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onCountryChange?: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const t = useTranslations('Common');

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)]">
      {onCountryChange ? (
        <CountryCombobox
          aria-describedby={ariaDescribedBy}
          aria-label={t('phoneCountry')}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          onChange={onCountryChange}
          value={countryCode}
        />
      ) : null}
      <Input
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        autoComplete="tel"
        className={onCountryChange ? '' : 'sm:col-span-2'}
        disabled={disabled}
        id={id}
        inputMode="tel"
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="tel"
        value={value}
      />
    </div>
  );
}
