"use client";

import {
  useOrganizationList,
  useUser,
} from '@clerk/nextjs';
import { useForm } from '@tanstack/react-form';
import {
  Loader2,
  Plus,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import {
  type ReactNode,
  useMemo,
  useState,
} from 'react';
import { GuidedFlowActions } from '@/components/guided-flow';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFieldError } from '@/lib/form-errors';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { defaultOrganizationName } from '../default-organization-name';
import { waitForClerkSessionPropagation } from '../session-propagation';
import { OnboardingItem } from './onboarding-item';

type OrganizationCreateFormProps = {
  description?: ReactNode;
  inviteCopy?: string;
  loadingLabel?: string;
  notice?: ReactNode;
  submitLabel?: string;
  title?: ReactNode;
};

export function OrganizationCreateForm({
  description,
  inviteCopy = 'Already invited? Open the invite link from your email to enter that workspace.',
  loadingLabel = 'Preparing workspace creation.',
  notice,
  submitLabel = 'Create workspace',
  title,
}: OrganizationCreateFormProps) {
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

  if (!isLoaded || !isUserLoaded) {
    if (title || description) {
      return (
        <OnboardingItem description={description} title={title}>
          <LoadingState label={loadingLabel} />
        </OnboardingItem>
      );
    }

    return <LoadingState label={loadingLabel} />;
  }

  return (
    <OrganizationCreateFormFields
      createOrganization={createOrganization}
      defaultName={defaultName}
      description={description}
      inviteCopy={inviteCopy}
      notice={notice}
      setActive={setActive}
      submitLabel={submitLabel}
      title={title}
    />
  );
}

function OrganizationCreateFormFields({
  createOrganization,
  defaultName,
  description,
  inviteCopy,
  notice,
  setActive,
  submitLabel,
  title,
}: {
  createOrganization: ReturnType<typeof useOrganizationList>['createOrganization'];
  defaultName: string;
  description?: ReactNode;
  inviteCopy: string;
  notice?: ReactNode;
  setActive: ReturnType<typeof useOrganizationList>['setActive'];
  submitLabel: string;
  title?: ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      organizationName: defaultName,
    },
    onSubmit: async ({ value }) => {
      const name = value.organizationName.trim();

      if (!createOrganization || !setActive) {
        setError('Workspace creation is still loading. Try again in a moment.');
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
            : 'The workspace could not be created.',
        );
      }
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
      <OnboardingItem description={description} title={title}>
        <div className="grid gap-4">
          {notice}
          {error ? (
            <ItemNotice
              description={error}
              title="Workspace could not be created"
              variant="error"
            />
          ) : null}

          <form.Field
            name="organizationName"
            validators={{
              onBlur: ({ value }) =>
                value.trim() ? undefined : 'Enter a workspace name.',
              onSubmit: ({ value }) =>
                value.trim() ? undefined : 'Enter a workspace name.',
            }}
          >
            {(field) => {
              const fieldError = getFieldError(field.state.meta.errors);

              return (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Workspace name</Label>
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
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder={defaultName}
                    value={field.state.value}
                  />
                  {fieldError ? (
                    <p className={textStyles.error} id={`${field.name}-error`}>
                      {fieldError}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
          <p className={textStyles.mutedBody}>
            {inviteCopy}
          </p>
        </div>
      </OnboardingItem>
      <GuidedFlowActions>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              {isSubmitting ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Plus aria-hidden="true" data-icon="inline-start" />
              )}
              {submitLabel}
            </Button>
          )}
        </form.Subscribe>
      </GuidedFlowActions>
    </form>
  );
}
