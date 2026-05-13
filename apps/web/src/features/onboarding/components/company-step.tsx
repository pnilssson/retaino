"use client";

import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import {
  type OrganizationProfileFormValues as ProfileDraft,
  validateRequired,
} from '@/features/organization-profile/organization-profile-form';
import { ProfileInput } from '@/features/organization-profile/profile-input';
import { getFieldError } from '@/lib/form-errors';
import { OnboardingItem } from './onboarding-item';

export function CompanyStep({
  defaultValues,
  onComplete,
  organizationName,
}: {
  defaultValues: ProfileDraft;
  onComplete: (value: ProfileDraft) => void;
  organizationName: string;
}) {
  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => onComplete(value),
  });

  return (
    <OnboardingItem
      description="Retaino uses this identity for agreements, billing records, and organization-level audit evidence."
      eyebrow="Company identity"
      title={<>Tell us who runs {organizationName}.</>}
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
              label="Legal company name"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              placeholder="Retaino AB"
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
              placeholder="559000-0000"
              value={field.state.value}
            />
          )}
        </form.Field>
        <div className="flex justify-end pt-2">
          <form.Subscribe selector={(state) => [state.canSubmit]}>
            {([canSubmit]) => (
              <Button disabled={!canSubmit} type="submit">
                Continue
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </OnboardingItem>
  );
}
