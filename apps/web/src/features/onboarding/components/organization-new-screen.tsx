"use client";

import { useOrganizationList, useUser } from '@clerk/nextjs';
import { useForm } from '@tanstack/react-form';
import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFieldError } from '@/lib/form-errors';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { defaultOrganizationName } from '../default-organization-name';
import { InlineError } from './inline-error';
import { OnboardingFrame } from './onboarding-frame';
import { OnboardingItem } from './onboarding-item';

export function OrganizationNewScreen() {
  const router = useRouter();
  const { isLoaded: isUserLoaded, user } = useUser();
  const { createOrganization, isLoaded, setActive } = useOrganizationList();
  const defaultName = useMemo(
    () =>
      defaultOrganizationName(
        user?.fullName,
        user?.primaryEmailAddress?.emailAddress,
    ),
    [user?.fullName, user?.primaryEmailAddress?.emailAddress],
  );
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      organizationName: defaultName,
    },
    onSubmit: async ({ value }) => {
      const name = value.organizationName.trim();

      if (!createOrganization || !setActive) {
        setError(
          'Organization creation is still loading. Try again in a moment.',
        );
        return;
      }

      setError(null);

      try {
        const organization = await createOrganization({ name });
        await setActive({ organization: organization.id });
        await waitForClerkSessionPropagation();
        router.replace(routes.organizationSetup);
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'The organization could not be created.',
        );
      }
    },
  });

  if (!isLoaded || !isUserLoaded) {
    return (
      <OnboardingFrame completedSteps={[]} currentStep="organization">
        <OnboardingItem
          eyebrow="New organization"
          title="Preparing organization creation."
        />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame completedSteps={[]} currentStep="organization">
      <OnboardingItem
        description="Set up a place for your team to manage contacts, campaigns, and results together."
        eyebrow="New organization"
        title="Create a shared workspace."
      >
        {error ? (
          <InlineError message={error} title="Organization could not be created" />
        ) : null}

        <form
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="organizationName"
            validators={{
              onBlur: ({ value }) =>
                value.trim() ? undefined : 'Enter an organization name.',
              onSubmit: ({ value }) =>
                value.trim() ? undefined : 'Enter an organization name.',
            }}
          >
            {(field) => {
              const fieldError = getFieldError(field.state.meta.errors);

              return (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Organization name</Label>
                  <Input
                    aria-describedby={
                      fieldError ? `${field.name}-error` : undefined
                    }
                    aria-invalid={Boolean(fieldError)}
                    autoComplete="organization"
                    disabled={form.state.isSubmitting}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(event.target.value)
                    }
                    placeholder={defaultName}
                    value={field.state.value}
                  />
                  {fieldError ? (
                    <p
                      className={textStyles.error}
                      id={`${field.name}-error`}
                    >
                      {fieldError}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                className="w-fit"
                disabled={!canSubmit || isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <Loader2
                    aria-hidden="true"
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <Plus aria-hidden="true" data-icon="inline-start" />
                )}
                Create organization
              </Button>
            )}
          </form.Subscribe>
          <p className="text-sm leading-6 text-muted-foreground">
            If you were invited to an existing organization, use the invitation
            link from your email instead.
          </p>
        </form>
      </OnboardingItem>
    </OnboardingFrame>
  );
}

function waitForClerkSessionPropagation() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });
}
