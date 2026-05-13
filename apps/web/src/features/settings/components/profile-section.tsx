"use client";

import { useForm } from '@tanstack/react-form';
import {
  formatPhoneCountryLabel,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { CountryCombobox } from '@/components/country-combobox';
import { PhoneInput } from '@/components/phone-input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { AppPageItem } from '@/features/appshell/components/app-page-content';
import { useUpdateOrganizationProfile } from '@/features/onboarding/hooks/use-update-organization-profile';
import {
  organizationProfileFormValuesFromSession,
  organizationProfileFormValuesToUpdateInput,
  type OrganizationProfileFormValues,
  validateCountryCode,
  validateEmail,
  validatePhone,
  validateRequired,
} from '@/features/organization-profile/organization-profile-form';
import { ProfileInput } from '@/features/organization-profile/profile-input';
import { getFieldError } from '@/lib/form-errors';

export function ProfileSection({
  canManageSetup,
  session,
}: {
  canManageSetup: boolean;
  session: OrganizationSession;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const profile = session.profile;

  function openEditMode() {
    setIsEditing(true);
  }

  function closeEditMode() {
    setIsEditing(false);
  }

  return (
    <AppPageItem asChild>
      <section id="organization-profile">
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle className="flex-wrap text-base">
              Organization profile
              {!profile ? <Badge variant="outline">Missing</Badge> : null}
            </ItemTitle>
            <ItemDescription className="max-w-2xl">
              Legal, billing, and responsible contact details for this
              organization.
            </ItemDescription>
          </ItemContent>
          {canManageSetup && !isEditing ? (
            <ItemActions>
              <Button onClick={openEditMode} type="button" variant="outline">
                {profile ? 'Edit profile' : 'Complete profile'}
              </Button>
            </ItemActions>
          ) : null}
        </ItemHeader>

        {isEditing ? (
          <ProfileEditor
            onCancel={closeEditMode}
            onSaved={closeEditMode}
            session={session}
          />
        ) : profile ? (
          <ProfileSummary profile={profile} />
        ) : (
          <Alert>
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Profile is not complete</AlertTitle>
            <AlertDescription>
              Organization admins need to add company and responsible contact
              details before the workspace is ready.
            </AlertDescription>
          </Alert>
        )}
      </section>
    </AppPageItem>
  );
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
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Profile could not be saved</AlertTitle>
          <AlertDescription>{updateProfile.error.message}</AlertDescription>
        </Alert>
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
        label="Responsible phone"
        value={profile.responsiblePhone ?? 'Not provided'}
      />
      <ProfileRow
        label="Default phone country"
        value={formatPhoneCountryLabel(profile.countryCode)}
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
      <Label htmlFor={name}>{label}</Label>
      <CountryCombobox
        aria-invalid={Boolean(error)}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        value={value}
      />
      {error ? (
        <p className="text-xs text-destructive" id={`${name}-error`}>
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
        <p className="text-xs text-destructive" id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}
