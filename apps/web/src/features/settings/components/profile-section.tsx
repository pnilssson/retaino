"use client";

import { useForm } from '@tanstack/react-form';
import {
  formatPhoneCountryLabel,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { formatCurrencyLabel } from '@retaino/shared';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { CountryCombobox } from '@/components/country-combobox';
import { CurrencyCombobox } from '@/components/currency-combobox';
import { InfoTooltip } from '@/components/info-tooltip';
import { ItemNotice } from '@/components/item-notice';
import { PhoneInput } from '@/components/phone-input';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AppPageSection } from '@/features/appshell/components/app-page-content';
import { useUpdateOrganizationProfile } from '@/features/onboarding/hooks/use-update-organization-profile';
import {
  organizationProfileFormValuesFromSession,
  organizationProfileFormValuesToUpdateInput,
  type OrganizationProfileFormValues,
  validateCountryCode,
  validateCurrencyCode,
  validateEmail,
  validatePhone,
  validateRequired,
} from '@/features/organization-profile/organization-profile-form';
import { ProfileInput } from '@/features/organization-profile/profile-input';
import { getFieldError } from '@/lib/form-errors';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function ProfileSection({
  canManageSetup,
  session,
}: {
  canManageSetup: boolean;
  session: OrganizationSession;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const profile = session.profile;
  const status = organizationProfileStatus(session);

  function openEditMode() {
    setIsEditing(true);
  }

  function closeEditMode() {
    setIsEditing(false);
  }

  return (
    <AppPageSection
      actions={
        canManageSetup && !isEditing ? (
              <Button onClick={openEditMode} type="button" variant="outline">
                <Pencil aria-hidden="true" data-icon="inline-start" />
                {profile ? 'Edit profile' : 'Complete profile'}
              </Button>
        ) : null
      }
      description="Legal, billing, and responsible contact details for this organization."
      id="organization-profile"
      title={
        <span className="flex flex-wrap items-center gap-2">
          Organization profile
          <StatusBadge label={status.label} tone={status.tone} />
        </span>
      }
    >
        {isEditing ? (
          <ProfileEditor
            onCancel={closeEditMode}
            onSaved={closeEditMode}
            session={session}
          />
        ) : profile ? (
          <ProfileSummary profile={profile} />
        ) : (
          <ItemNotice
            description="Organization admins need to add company and responsible contact details before the workspace is ready."
            title="Profile is not complete"
            variant="warning"
          />
        )}
    </AppPageSection>
  );
}

function organizationProfileStatus(session: OrganizationSession) {
  if (session.readiness.legalUpdatesRequired) {
    return {
      label: 'Legal updates required',
      tone: 'amber',
    } as const;
  }

  if (session.readiness.ready) {
    return {
      label: 'Ready',
      tone: 'green',
    } as const;
  }

  return {
    label: 'Setup incomplete',
    tone: 'amber',
  } as const;
}

function ProfileEditor({
  onCancel,
  onSaved,
  session,
}: {
  onCancel: () => void;
  onSaved: () => void;
  session: OrganizationSession;
}) {
  const updateProfile = useUpdateOrganizationProfile();
  const form = useForm({
    defaultValues: organizationProfileFormValuesFromSession(session),
    onSubmit: async ({ value }) => {
      await updateProfile.mutateAsync(
        organizationProfileFormValuesToUpdateInput(value),
      );
      onSaved();
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
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field
          name="legalName"
          validators={{
            onBlur: ({ value }) =>
              validateRequired(value, 'Enter the legal company name.'),
            onSubmit: ({ value }) =>
              validateRequired(value, 'Enter the legal company name.'),
          }}
        >
          {(field) => (
            <ProfileInput
              error={getFieldError(field.state.meta.errors)}
              label="Legal name"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              value={field.state.value}
            />
          )}
        </form.Field>
        <form.Field
          name="registrationNumber"
          validators={{
            onBlur: ({ value }) =>
              validateRequired(value, 'Enter the registration number.'),
            onSubmit: ({ value }) =>
              validateRequired(value, 'Enter the registration number.'),
          }}
        >
          {(field) => (
            <ProfileInput
              error={getFieldError(field.state.meta.errors)}
              label="Registration number"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              value={field.state.value}
            />
          )}
        </form.Field>
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
              value={field.state.value}
            />
          )}
        </form.Field>
        <form.Field
          name="responsibleEmail"
          validators={{
            onBlur: ({ value }) =>
              validateEmail(value, 'responsible email'),
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
            <ProfileCountryInput
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
            <ProfileCurrencyInput
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
            <ProfilePhoneInput
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

      {updateProfile.error ? (
        <ItemNotice
          description={updateProfile.error.message}
          title="Profile could not be saved"
          variant="error"
        />
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={updateProfile.isPending}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              disabled={!canSubmit || updateProfile.isPending || isSubmitting}
              type="submit"
            >
              {updateProfile.isPending || isSubmitting
                ? 'Saving profile'
                : 'Save profile'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}

function ProfileSummary({
  profile,
}: {
  profile: NonNullable<OrganizationSession['profile']>;
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <ProfileRow label="Legal name" value={profile.legalName} />
      <ProfileRow
        label="Registration number"
        value={profile.registrationNumber}
      />
      <ProfileRow label="Billing email" value={profile.billingEmail} />
      <ProfileRow label="Responsible contact" value={profile.responsibleName} />
      <ProfileRow label="Responsible email" value={profile.responsibleEmail} />
      <ProfileRow
        label="Default phone country"
        value={formatPhoneCountryLabel(profile.countryCode)}
      />
      <ProfileRow
        label="Currency"
        value={formatCurrencyLabel(profile.currency)}
      />
      <ProfileRow
        label="Responsible phone"
        value={profile.responsiblePhone ?? 'Not provided'}
      />
    </dl>
  );
}

function ProfileCountryInput({
  error,
  label,
  name,
  onBlur,
  onChange,
  value,
}: {
  error: string | null;
  label: string;
  name: keyof OrganizationProfileFormValues;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={name}>{label}</Label>
        <InfoTooltip label="Default phone country details">
          Used when imported phone numbers have no country prefix.
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

function ProfileCurrencyInput({
  error,
  label,
  name,
  onBlur,
  onChange,
  value,
}: {
  error: string | null;
  label: string;
  name: keyof OrganizationProfileFormValues;
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

function ProfilePhoneInput({
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
  name: keyof OrganizationProfileFormValues;
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

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className={textStyles.meta}>{label}</dt>
      <dd className={cn('min-w-0 truncate', textStyles.itemTitle)}>
        {value}
      </dd>
    </div>
  );
}
