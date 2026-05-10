"use client";

import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import {
  type OrganizationProfileFormValues as ProfileDraft,
  validateRequired,
} from '@/features/organization-profile/organization-profile-form';
import { ProfileInput } from '@/features/organization-profile/profile-input';
import { getFieldError } from '@/lib/form-errors';

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
    <section className="pt-4">
      <p className="text-sm text-muted-foreground">Company identity</p>
      <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
        Tell us who runs {organizationName}.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Retaino uses this identity for agreements, billing records, and
        organization-level audit evidence.
      </p>

      <form
        className="mt-8 grid gap-5"
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
            onChange: ({ value }) =>
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
            onChange: ({ value }) =>
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
    </section>
  );
}
