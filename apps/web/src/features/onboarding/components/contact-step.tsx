"use client";

import { useForm } from '@tanstack/react-form';
import { ArrowLeft, ArrowRight, Info, Loader2 } from 'lucide-react';
import { CountryCombobox } from '@/components/country-combobox';
import { CurrencyCombobox } from '@/components/currency-combobox';
import { GuidedFlowActions } from '@/components/guided-flow';
import { ItemNotice } from '@/components/item-notice';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await onComplete(value);
    },
  });

  return (
    <OnboardingItem
      description="This contact is used for compliance, billing, and operational follow-up if a campaign needs review."
      eyebrow="Responsible contact"
      title="Add the person accountable for campaigns."
    >
      <form
        className="grid gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field
            name="billingEmail"
            validators={{
              onBlur: ({ value }) => validateEmail(value, 'billing email'),
              onSubmit: ({ value }) => validateEmail(value, 'billing email'),
            }}
          >
            {(field) => (
              <ProfileInput
                error={getFieldError(field.state.meta.errors)}
                label="Billing email"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                placeholder="billing@example.com"
                type="email"
                value={field.state.value}
              />
            )}
          </form.Field>
          <form.Field
            name="responsibleName"
            validators={{
              onBlur: ({ value }) =>
                validateRequired(value, 'Enter the responsible contact.'),
              onSubmit: ({ value }) =>
                validateRequired(value, 'Enter the responsible contact.'),
            }}
          >
            {(field) => (
              <ProfileInput
                error={getFieldError(field.state.meta.errors)}
                label="Responsible contact"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                placeholder="Ada Lovelace"
                value={field.state.value}
              />
            )}
          </form.Field>
          <form.Field
            name="responsibleEmail"
            validators={{
              onBlur: ({ value }) => validateEmail(value, 'responsible email'),
              onSubmit: ({ value }) => validateEmail(value, 'responsible email'),
            }}
          >
            {(field) => (
              <ProfileInput
                error={getFieldError(field.state.meta.errors)}
                label="Responsible email"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                placeholder="ada@example.com"
                type="email"
                value={field.state.value}
              />
            )}
          </form.Field>
          <form.Field
            name="countryCode"
            validators={{
              onBlur: ({ value }) => validateCountryCode(value),
              onSubmit: ({ value }) => validateCountryCode(value),
            }}
          >
            {(field) => (
              <CountryInput
                error={getFieldError(field.state.meta.errors)}
                label="Default phone country"
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
              onBlur: ({ value }) => validateCurrencyCode(value),
              onSubmit: ({ value }) => validateCurrencyCode(value),
            }}
          >
            {(field) => (
              <CurrencyInput
                error={getFieldError(field.state.meta.errors)}
                label="Currency"
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
                validatePhone(value, form.getFieldValue('countryCode')),
              onSubmit: ({ value }) =>
                validatePhone(value, form.getFieldValue('countryCode')),
            }}
          >
            {(field) => (
              <PhoneField
                countryCode={form.getFieldValue('countryCode')}
                error={getFieldError(field.state.meta.errors)}
                label="Responsible phone"
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
            title="Profile could not be saved"
            variant="error"
          />
        ) : null}

        <GuidedFlowActions
          backLabel={
            <>
              <ArrowLeft aria-hidden="true" data-icon="inline-start" />
              Back
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
                {isPending || isSubmitting ? 'Saving profile' : 'Save and continue'}
                {!isPending && !isSubmitting ? (
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                ) : null}
              </Button>
            )}
          </form.Subscribe>
        </GuidedFlowActions>
      </form>
    </OnboardingItem>
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
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={name}>{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label="Default phone country details"
                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                type="button"
              >
                <Info aria-hidden="true" className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">
              Used when imported phone numbers have no country prefix.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
