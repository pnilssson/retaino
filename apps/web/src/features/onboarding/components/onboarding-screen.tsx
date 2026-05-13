"use client";

import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { useActiveOrganizationBootstrap } from '../hooks/use-active-organization-bootstrap';
import { useOrganizationSession } from '../hooks/use-organization-session';
import { OnboardingFlow, onboardingFlowKey } from './flow';
import { OnboardingFrame } from './onboarding-frame';
import { OnboardingItem } from './onboarding-item';
import { OrganizationRequired } from './organization-required';
import { SetupError, SetupPending } from './setup-states';

export function OnboardingScreen() {
  const organizationBootstrap = useActiveOrganizationBootstrap();
  const session = useOrganizationSession({
    enabled: organizationBootstrap.isReady,
  });

  if (
    !organizationBootstrap.isLoaded ||
    organizationBootstrap.isBootstrapping ||
    (!organizationBootstrap.isReady &&
      !organizationBootstrap.needsOrganization &&
      !organizationBootstrap.error) ||
    session.isLoading
  ) {
    return (
      <OnboardingFrame completedSteps={[]} currentStep="organization">
        <OnboardingItem
          eyebrow="Organization"
          title="Preparing organization setup."
        />
      </OnboardingFrame>
    );
  }

  if (organizationBootstrap.needsOrganization) {
    return <OrganizationRequired />;
  }

  if (organizationBootstrap.error) {
    return (
      <OnboardingFrame completedSteps={[]} currentStep="organization">
        <SetupError
          message={
            organizationBootstrap.error.message ||
            'Refresh the page and try again.'
          }
          title="Organization setup could not be prepared"
        />
      </OnboardingFrame>
    );
  }

  if (session.isError) {
    if (
      session.error instanceof ApiClientError &&
      session.error.code === 'active_organization_required'
    ) {
      return <OrganizationRequired />;
    }

    return (
      <OnboardingFrame completedSteps={['organization']} currentStep="company">
        <SetupError
          action={
            <Button
              className="mt-4"
              onClick={() => void session.refetch()}
              size="sm"
              type="button"
              variant="outline"
            >
              Retry setup
            </Button>
          }
          message={session.error.message || 'Refresh the page and try again.'}
          title="Organization setup could not be loaded"
        />
      </OnboardingFrame>
    );
  }

  if (!session.data) {
    return null;
  }

  if (
    !session.data.readiness.ready &&
    !canManageOrganizationSetup(session.data.organization.role)
  ) {
    return (
      <OnboardingFrame completedSteps={['organization']} currentStep="company">
        <SetupPending organizationName={session.data.organization.name} />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFlow
      key={onboardingFlowKey(session.data)}
      session={session.data}
    />
  );
}
