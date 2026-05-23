"use client";

import { useOrganizationList } from '@clerk/nextjs';
import { Building2, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GuidedFlowActions } from '@/components/guided-flow';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { ItemTitle } from '@/components/ui/item';
import { routes } from '@/lib/routes';
import { waitForClerkSessionPropagation } from '../session-propagation';
import { OrganizationCreateForm } from './organization-create-form';
import { OnboardingFrame } from './onboarding-frame';
import { OnboardingItem } from './onboarding-item';

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
      setError('Workspace selection is still loading. Try again in a moment.');
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
          : 'The workspace could not be selected.',
      );
    } finally {
      setPendingOrganizationId(null);
    }
  }

  if (!isLoaded) {
    return (
      <OnboardingFrame completedSteps={[]} currentStep="organization">
        <OnboardingItem
          eyebrow="Workspace"
          title="Preparing workspace setup."
        />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame completedSteps={[]} currentStep="organization">
      <OnboardingItem
        description={
          hasExistingOrganizations
            ? 'Select where you want to continue. Create a new workspace only if you are setting up a separate team.'
            : "Retaino keeps your team's contacts, campaigns, permissions, and results in one shared workspace."
        }
        eyebrow="Workspace"
        title={
          hasExistingOrganizations
            ? 'Choose your workspace.'
            : 'Set up your workspace.'
        }
      >
        {error ? (
          <ItemNotice
            description={error}
            title="Workspace could not be selected"
            variant="error"
          />
        ) : null}

        {!hasExistingOrganizations ? <OrganizationCreateForm /> : null}

        {hasExistingOrganizations ? (
          <div className="border-y py-5">
            <ItemTitle>Your workspaces</ItemTitle>
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
                    <Loader2
                      aria-hidden="true"
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <Building2 aria-hidden="true" data-icon="inline-start" />
                  )}
                  <span className="min-w-0 truncate">
                    {membership.organization.name}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {hasExistingOrganizations ? (
          <>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Already invited? Open the invite link from your email to enter
              that workspace.
            </p>
            <GuidedFlowActions>
              <Button asChild variant="outline">
                <Link href={routes.organizationNew}>
                  <Plus aria-hidden="true" data-icon="inline-start" />
                  Create another workspace
                </Link>
              </Button>
            </GuidedFlowActions>
          </>
        ) : null}
      </OnboardingItem>
    </OnboardingFrame>
  );
}
