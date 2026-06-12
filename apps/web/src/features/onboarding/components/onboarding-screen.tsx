"use client";

import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { useActiveOrganizationBootstrap } from '../hooks/use-active-organization-bootstrap';
import { useOrganizationSession } from '../hooks/use-organization-session';
import {
  OnboardingFlow,
  onboardingFlowKey,
} from './flow';
import {
  OnboardingFrame,
  OnboardingLoading,
} from './onboarding-frame';
import { OnboardingItem } from './onboarding-item';
import { OrganizationRequired } from './organization-required';
import {
  SetupError,
  SetupPending,
} from './setup-states';

export function OnboardingScreen() {
  const t = useTranslations('Onboarding');
  const router = useRouter();
  const organizationBootstrap = useActiveOrganizationBootstrap();
  const session = useOrganizationSession({
    enabled: organizationBootstrap.isReady,
  });

  useEffect(() => {
    if (session.data?.readiness.ready) {
      router.replace(routes.overview);
    }
  }, [router, session.data?.readiness.ready]);

  if (
    !organizationBootstrap.isLoaded ||
    organizationBootstrap.isBootstrapping ||
    (!organizationBootstrap.isReady &&
      !organizationBootstrap.needsOrganization &&
      !organizationBootstrap.error) ||
    session.isLoading
  ) {
    return (
      <OnboardingLoading
        currentStep="organization"
        label={t('loadingOrganizationSetup')}
      />
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
            t('refreshAndTryAgain')
          }
          title={t('setupPrepareTitle')}
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
              <RefreshCw aria-hidden="true" data-icon="inline-start" />
              {t('retrySetup')}
            </Button>
          }
          message={session.error.message || t('refreshAndTryAgain')}
          title={t('setupLoadTitle')}
        />
      </OnboardingFrame>
    );
  }

  if (!session.data) {
    return null;
  }

  if (session.data.readiness.ready) {
    return (
      <OnboardingFrame
        completedSteps={['organization', 'company', 'contact', 'agreements']}
        currentStep="agreements"
      >
        <OnboardingItem eyebrow={t('openingOverviewEyebrow')} title={t('openingOverviewTitle')} />
      </OnboardingFrame>
    );
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
