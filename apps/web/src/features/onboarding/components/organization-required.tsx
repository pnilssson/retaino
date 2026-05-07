"use client";

import { useOrganizationList } from '@clerk/nextjs';
import { AlertCircle, Building2, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';
import { OnboardingFrame } from './onboarding-frame';

export function OrganizationRequired() {
  const router = useRouter();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      pageSize: 20,
    },
  });
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const memberships = userMemberships.data ?? [];
  const hasExistingOrganizations = memberships.length > 0;
  const isBusy = Boolean(pendingOrganizationId) || userMemberships.isLoading;

  async function activateOrganization(organizationId: string) {
    if (!setActive) {
      setError('Organization selection is still loading. Try again in a moment.');
      return;
    }

    setError(null);
    setPendingOrganizationId(organizationId);

    try {
      await setActive({ organization: organizationId });
      await waitForClerkSessionPropagation();
      router.replace(routes.organizationSetup);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The organization could not be selected.',
      );
    } finally {
      setPendingOrganizationId(null);
    }
  }

  if (!isLoaded) {
    return (
      <OnboardingFrame completedSteps={[]} currentStep="organization">
        <section className="pt-10">
          <p className="text-sm text-muted-foreground">
            Preparing organization setup.
          </p>
        </section>
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame completedSteps={[]} currentStep="organization">
      <section className="pt-10">
        <p className="text-sm text-muted-foreground">Organization</p>
        <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
          {hasExistingOrganizations
            ? 'Choose an organization to continue.'
            : 'Create or join an organization.'}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Retaino works inside a shared workspace so your team can use the same
          contacts, campaigns, and results.
        </p>

        {error ? (
          <Alert className="mt-6" variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Organization could not be selected</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {hasExistingOrganizations ? (
          <div className="mt-8 border-y py-5">
            <p className="text-sm font-medium">Your organizations</p>
            <div className="mt-4 grid gap-2">
              {memberships.map((membership) => (
                <Button
                  className="h-auto justify-start gap-3 px-3 py-3 text-left"
                  disabled={isBusy}
                  key={membership.organization.id}
                  onClick={() =>
                    void activateOrganization(membership.organization.id)
                  }
                  type="button"
                  variant="outline"
                >
                  {pendingOrganizationId === membership.organization.id ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Building2 aria-hidden="true" />
                  )}
                  <span className="min-w-0 truncate">
                    {membership.organization.name}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-3">
          <Button asChild className="w-fit">
            <Link href={routes.organizationNew}>
              <Plus aria-hidden="true" />
              Create organization
            </Link>
          </Button>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            If you were invited to an existing organization, use the invitation
            link from your email. You do not need to create a new workspace.
          </p>
        </div>
      </section>
    </OnboardingFrame>
  );
}

function waitForClerkSessionPropagation() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });
}
