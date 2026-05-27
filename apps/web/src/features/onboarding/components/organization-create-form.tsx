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
import { useRouter } from 'next/navigation';
import {
  useMemo,
  useState,
} from 'react';
import { GuidedFlowActions } from '@/components/guided-flow';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFieldError } from '@/lib/form-errors';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { defaultOrganizationName } from '../default-organization-name';
import { waitForClerkSessionPropagation } from '../session-propagation';

type OrganizationCreateFormProps = {
  inviteCopy?: string;
  loadingLabel?: string;
  submitLabel?: string;
};

export function OrganizationCreateForm({
  inviteCopy = 'Already invited? Open the invite link from your email to enter that workspace.',
  loadingLabel = 'Preparing workspace creation.',
  submitLabel = 'Create workspace',
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
    return <p className={textStyles.mutedBody}>{loadingLabel}</p>;
  }

  return (
    <OrganizationCreateFormFields
      createOrganization={createOrganization}
      defaultName={defaultName}
      inviteCopy={inviteCopy}
      setActive={setActive}
      submitLabel={submitLabel}
    />
  );
}

function OrganizationCreateFormFields({
  createOrganization,
  defaultName,
  inviteCopy,
  setActive,
  submitLabel,
}: {
  createOrganization: ReturnType<typeof useOrganizationList>['createOrganization'];
  defaultName: string;
  inviteCopy: string;
  setActive: ReturnType<typeof useOrganizationList>['setActive'];
  submitLabel: string;
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
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
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
      <p className="max-w-xl text-sm leading-6 text-muted-foreground">
        {inviteCopy}
      </p>
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
