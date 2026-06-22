"use client";

import { useForm } from '@tanstack/react-form';
import {
  formatPhoneCountryLabel,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { formatCurrencyLabel } from '@retaino/shared';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CountryCombobox } from '@/components/country-combobox';
import { CurrencyCombobox } from '@/components/currency-combobox';
import { InfoTooltip } from '@/components/info-tooltip';
import { ItemNotice } from '@/components/item-notice';
import { PhoneInput } from '@/components/phone-input';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ContentSection } from '@/features/appshell/components/content-section';
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
  const t = useTranslations('Settings');
  const [isEditing, setIsEditing] = useState(false);
  const profile = session.profile;
  const status = organizationProfileStatus(session, t);

  function openEditMode() {
    setIsEditing(true);
  }

  function closeEditMode() {
    setIsEditing(false);
  }

  return (
    <ContentSection
      actions={
        canManageSetup && !isEditing ? (
          <Button onClick={openEditMode} type="button">
            <Pencil aria-hidden="true" data-icon="inline-start" />
            {profile ? t('edit') : t('completeProfile')}
          </Button>
        ) : null
      }
      id="organization-profile"
      title={
        <span className="flex flex-wrap items-center gap-2">
          {t('profileTitle')}
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
          description={t('profileIncompleteDescription')}
          title={t('profileIncompleteTitle')}
          variant="warning"
        />
      )}
    </ContentSection>
  );
}

function organizationProfileStatus(
  session: OrganizationSession,
  t: ReturnType<typeof useTranslations<'Settings'>>,
) {
  if (session.readiness.legalUpdatesRequired) {
    return {
      label: t('legalUpdatesRequired'),
      tone: 'amber',
    } as const;
  }

  if (session.readiness.ready) {
    return {
      label: t('ready'),
      tone: 'green',
    } as const;
  }

  return {
    label: t('setupIncomplete'),
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
  const t = useTranslations('Settings');
  const common = useTranslations('Common');
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
              validateRequired(value, t('requiredLegalName')),
            onSubmit: ({ value }) =>
              validateRequired(value, t('requiredLegalName')),
          }}
        >
          {(field) => (
            <ProfileInput
              error={getFieldError(field.state.meta.errors)}
              label={t('legalName')}
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
              validateRequired(value, t('requiredRegistrationNumber')),
            onSubmit: ({ value }) =>
              validateRequired(value, t('requiredRegistrationNumber')),
          }}
        >
          {(field) => (
            <ProfileInput
              error={getFieldError(field.state.meta.errors)}
              label={t('registrationNumber')}
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
              type="email"
              value={field.state.value}
            />
          )}
        </form.Field>
        <form.Field
          name="responsibleName"
          validators={{
            onBlur: ({ value }) =>
              validateRequired(value, t('requiredResponsibleContact')),
            onSubmit: ({ value }) =>
              validateRequired(value, t('requiredResponsibleContact')),
          }}
        >
          {(field) => (
            <ProfileInput
              error={getFieldError(field.state.meta.errors)}
              label={t('responsibleContact')}
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
            <ProfileCountryInput
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
            <ProfileCurrencyInput
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
            <ProfilePhoneInput
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

      {updateProfile.error ? (
        <ItemNotice
          description={updateProfile.error.message}
          title={t('profileSaveErrorTitle')}
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
          {t('cancel')}
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
                ? t('savingProfile')
                : t('saveProfile')}
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
  const t = useTranslations('Settings');
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <ProfileRow label={t('legalName')} value={profile.legalName} />
      <ProfileRow
        label={t('registrationNumber')}
        value={profile.registrationNumber}
      />
      <ProfileRow label={t('billingEmail')} value={profile.billingEmail} />
      <ProfileRow label={t('responsibleContact')} value={profile.responsibleName} />
      <ProfileRow label={t('responsibleEmail')} value={profile.responsibleEmail} />
      <ProfileRow
        label={t('defaultPhoneCountry')}
        value={formatPhoneCountryLabel(profile.countryCode)}
      />
      <ProfileRow
        label={t('currency')}
        value={formatCurrencyLabel(profile.currency)}
      />
      <ProfileRow
        label={t('responsiblePhone')}
        value={profile.responsiblePhone ?? t('notProvided')}
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
  const t = useTranslations('Settings');
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={name}>{label}</Label>
        <InfoTooltip label={t('defaultPhoneCountryTooltip')}>
          {t('defaultPhoneCountryTooltip')}
        </InfoTooltip>
      </div>
      <CountryCombobox
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        value={value}
      />
      {error ? (
        <p className={textStyles.error} id={`${name}-error`} role="alert">
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
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        value={value}
      />
      {error ? (
        <p className={textStyles.error} id={`${name}-error`} role="alert">
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
        aria-describedby={error ? `${name}-error` : undefined}
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
        <p className={textStyles.error} id={`${name}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className={textStyles.small}>{label}</dt>
      <dd className={cn('min-w-0 truncate', textStyles.h3)}>
        {value}
      </dd>
    </div>
  );
}
