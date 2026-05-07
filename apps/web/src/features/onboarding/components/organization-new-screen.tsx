"use client";

import { useOrganizationList, useUser } from '@clerk/nextjs';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { routes } from '@/lib/routes';
import { defaultOrganizationName } from '../lib/default-organization-name';
import { OnboardingFrame } from './onboarding-frame';

export function OrganizationNewScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { createOrganization, isLoaded, setActive } = useOrganizationList();
  const defaultName = useMemo(
    () =>
      defaultOrganizationName(
        user?.fullName,
        user?.primaryEmailAddress?.emailAddress,
      ),
    [user?.fullName, user?.primaryEmailAddress?.emailAddress],
  );
  const [organizationName, setOrganizationName] = useState(defaultName);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = organizationName.trim();

    if (!name) {
      setError('Enter an organization name.');
      return;
    }

    if (!createOrganization || !setActive) {
      setError('Organization creation is still loading. Try again in a moment.');
      return;
    }

    setError(null);
    setIsPending(true);

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
    } finally {
      setIsPending(false);
    }
  }

  if (!isLoaded) {
    return (
      <OnboardingFrame completedSteps={[]} currentStep="organization">
        <section className="pt-10">
          <p className="text-sm text-muted-foreground">
            Preparing organization creation.
          </p>
        </section>
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame completedSteps={[]} currentStep="organization">
      <section className="pt-10">
        <p className="text-sm text-muted-foreground">New organization</p>
        <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
          Create a shared workspace.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Set up a place for your team to manage contacts, campaigns, and
          results together.
        </p>

        {error ? (
          <Alert className="mt-6" variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Organization could not be created</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form className="mt-8 grid gap-4" onSubmit={handleCreateOrganization}>
          <div className="grid gap-2">
            <Label htmlFor="organization-name">Organization name</Label>
            <Input
              autoComplete="organization"
              disabled={isPending}
              id="organization-name"
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder={defaultName}
              value={organizationName}
            />
          </div>
          <Button className="w-fit" disabled={isPending} type="submit">
            {isPending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            Create organization
          </Button>
          <p className="text-sm leading-6 text-muted-foreground">
            If you were invited to an existing organization, use the invitation
            link from your email instead.
          </p>
        </form>
      </section>
    </OnboardingFrame>
  );
}

function waitForClerkSessionPropagation() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });
}
