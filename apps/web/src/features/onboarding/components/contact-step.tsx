"use client";

import { useForm } from '@tanstack/react-form';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { CountryCombobox } from '@/components/country-combobox';
import { CurrencyCombobox } from '@/components/currency-combobox';
import { GuidedFlowActions } from '@/components/guided-flow';
import { InfoTooltip } from '@/components/info-tooltip';
import { ItemNotice } from '@/components/item-notice';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  type OrganizationProfileFormValues as ProfileDraft,
  validateCountryCode,
  validateCurrencyCode,
  validateEmail,
  validatePhone,
  validateRequired,
} from '@/features/organization-profile/organization-profile-form';
import { ProfileInput } from '@/features/organization-profile/profile-input';
import { getFieldError } from '@/lib/form-errors';
import { textStyles } from '@/lib/text-styles';
import { OnboardingItem } from './onboarding-item';

export function ContactStep({
  defaultValues,
  isPending,
  mutationError,
  onBack,
  onComplete,
}: {
  defaultValues: ProfileDraft;
  isPending: boolean;
  mutationError: string | null;
  onBack: () => void;
  onComplete: (value: ProfileDraft) => Promise<void>;
}) {
  const t = useTranslations('Onboarding');
  const common = useTranslations('Common');
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await onComplete(value);
    },
  });

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <OnboardingItem
        description={t('contactDescription')}
        eyebrow={t('contactEyebrow')}
        title={t('contactTitle')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field
            name="billingEmail"
            validators={{
              onBlur: ({ value }) =>
                validateEmail(
                  value,
                  common('enterField', { field: t('billingEmailField') }),
                  common('invalidEmailAddress'),
                ),
              onSubmit: ({ value }) =>
                validateEmail(
                  value,
                  common('enterField', { field: t('billingEmailField') }),
                  common('invalidEmailAddress'),
                ),
            }}
          >
            {(field) => (
              <ProfileInput
                error={getFieldError(field.state.meta.errors)}
                label={t('billingEmail')}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                placeholder={t('billingEmailPlaceholder')}
                type="email"
                value={field.state.value}
              />
            )}
          </form.Field>
          <form.Field
            name="responsibleName"
            validators={{
              onBlur: ({ value }) =>
                validateRequired(value, t('responsibleContactRequired')),
              onSubmit: ({ value }) =>
                validateRequired(value, t('responsibleContactRequired')),
            }}
          >
            {(field) => (
              <ProfileInput
                error={getFieldError(field.state.meta.errors)}
                label={t('responsibleContact')}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                placeholder={t('responsibleContactPlaceholder')}
                value={field.state.value}
              />
            )}
          </form.Field>
          <form.Field
            name="responsibleEmail"
            validators={{
              onBlur: ({ value }) =>
                validateEmail(
                  value,
                  common('enterField', { field: t('responsibleEmailField') }),
                  common('invalidEmailAddress'),
                ),
              onSubmit: ({ value }) =>
                validateEmail(
                  value,
                  common('enterField', { field: t('responsibleEmailField') }),
                  common('invalidEmailAddress'),
                ),
            }}
          >
            {(field) => (
              <ProfileInput
                error={getFieldError(field.state.meta.errors)}
                label={t('responsibleEmail')}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                placeholder={t('responsibleEmailPlaceholder')}
                type="email"
                value={field.state.value}
              />
            )}
          </form.Field>
          <form.Field
            name="countryCode"
            validators={{
              onBlur: ({ value }) =>
                validateCountryCode(value, common('chooseSupportedCountry')),
              onSubmit: ({ value }) =>
                validateCountryCode(value, common('chooseSupportedCountry')),
            }}
          >
            {(field) => (
              <CountryInput
                error={getFieldError(field.state.meta.errors)}
                label={t('defaultPhoneCountry')}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(value) =>
                  field.handleChange(value as typeof field.state.value)
                }
                value={field.state.value}
              />
            )}
          </form.Field>
          <form.Field
            name="currency"
            validators={{
              onBlur: ({ value }) =>
                validateCurrencyCode(value, common('chooseSupportedCurrency')),
              onSubmit: ({ value }) =>
                validateCurrencyCode(value, common('chooseSupportedCurrency')),
            }}
          >
            {(field) => (
              <CurrencyInput
                error={getFieldError(field.state.meta.errors)}
                label={t('currency')}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(value) =>
                  field.handleChange(value as typeof field.state.value)
                }
                value={field.state.value}
              />
            )}
          </form.Field>
          <form.Field
            name="responsiblePhone"
            validators={{
              onBlur: ({ value }) =>
                validatePhone(
                  value,
                  form.getFieldValue('countryCode'),
                  common('invalidPhoneNumber'),
                ),
              onSubmit: ({ value }) =>
                validatePhone(
                  value,
                  form.getFieldValue('countryCode'),
                  common('invalidPhoneNumber'),
                ),
            }}
          >
            {(field) => (
              <PhoneField
                countryCode={form.getFieldValue('countryCode')}
                error={getFieldError(field.state.meta.errors)}
                label={t('responsiblePhone')}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                onCountryChange={(value) =>
                  form.setFieldValue('countryCode', value)
                }
                value={field.state.value}
              />
            )}
          </form.Field>
        </div>

        {mutationError ? (
          <ItemNotice
            description={mutationError}
            title={t('profileSaveErrorTitle')}
            variant="error"
          />
        ) : null}
      </OnboardingItem>
      <GuidedFlowActions
        backLabel={
          <>
            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
            {t('back')}
          </>
        }
        onBack={onBack}
      >
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              disabled={!canSubmit || isPending || isSubmitting}
              type="submit"
            >
              {isPending || isSubmitting ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : null}
              {isPending || isSubmitting ? t('savingProfile') : t('saveAndContinue')}
              {!isPending && !isSubmitting ? (
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              ) : null}
            </Button>
          )}
        </form.Subscribe>
      </GuidedFlowActions>
    </form>
  );
}

function CountryInput({
  error,
  label,
  name,
  onBlur,
  onChange,
  value,
}: {
  error: string | null;
  label: string;
  name: keyof ProfileDraft;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  const t = useTranslations('Onboarding');

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={name}>{label}</Label>
        <InfoTooltip label={t('defaultPhoneCountryTooltip')}>
          {t('defaultPhoneCountryTooltip')}
        </InfoTooltip>
      </div>
      <CountryCombobox
        aria-invalid={Boolean(error)}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        value={value}
      />
      {error ? (
        <p className={textStyles.error} id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CurrencyInput({
  error,
  label,
  name,
  onBlur,
  onChange,
  value,
}: {
  error: string | null;
  label: string;
  name: keyof ProfileDraft;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <CurrencyCombobox
        aria-invalid={Boolean(error)}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        value={value}
      />
      {error ? (
        <p className={textStyles.error} id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PhoneField({
  countryCode,
  error,
  label,
  name,
  onBlur,
  onChange,
  onCountryChange,
  value,
}: {
  countryCode: string;
  error: string | null;
  label: string;
  name: keyof ProfileDraft;
  onBlur: () => void;
  onChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <PhoneInput
        aria-invalid={Boolean(error)}
        countryCode={countryCode}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        onCountryChange={onCountryChange}
        value={value}
      />
      {error ? (
        <p className={textStyles.error} id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
