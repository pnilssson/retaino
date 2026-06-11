"use client";

import type { OrganizationSession } from '@retaino/shared/contracts';
import {
  useMemo,
  useState,
} from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  organizationProfileFormValuesFromSession,
  organizationProfileFormValuesToUpdateInput,
  type OrganizationProfileFormValues as ProfileDraft,
} from '@/features/organization-profile/organization-profile-form';
import { routes } from '@/lib/routes';
import { useCreateCurrentOrganizationLegalAcceptance } from '../hooks/use-create-current-organization-legal-acceptance';
import { useUpdateOrganizationProfile } from '../hooks/use-update-organization-profile';
import { AgreementsStep } from './agreements-step';
import { CompanyStep } from './company-step';
import { ContactStep } from './contact-step';
import {
  OnboardingFrame,
  type OnboardingStepId,
} from './onboarding-frame';

export function OnboardingFlow({ session }: { session: OrganizationSession }) {
  const router = useRouter();
  const updateProfile = useUpdateOrganizationProfile();
  const createLegalAcceptance = useCreateCurrentOrganizationLegalAcceptance();
  const initialDraft = useMemo(
    () => organizationProfileFormValuesFromSession(session),
    [session],
  );
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(initialDraft);
  const [activeStep, setActiveStep] = useState<OnboardingStepId>(
    resolveInitialStep(session),
  );

  const completedSteps = completedStepsFor(session, activeStep);

  return (
    <OnboardingFrame completedSteps={completedSteps} currentStep={activeStep}>
      {activeStep === 'company' ? (
        <CompanyStep
          defaultValues={profileDraft}
          onComplete={(value) => {
            setProfileDraft(value);
            setActiveStep('contact');
          }}
          organizationName={session.organization.name}
        />
      ) : activeStep === 'contact' ? (
        <ContactStep
          defaultValues={profileDraft}
          isPending={updateProfile.isPending}
          mutationError={updateProfile.error?.message ?? null}
          onBack={() => setActiveStep('company')}
          onComplete={async (value) => {
            await updateProfile.mutateAsync(
              organizationProfileFormValuesToUpdateInput(value),
            );
            setProfileDraft(value);
            if (session.readiness.legalCurrent) {
              router.replace(routes.overview);
              router.refresh();
              return;
            }

            setActiveStep('agreements');
          }}
        />
      ) : (
        <AgreementsStep
          isPending={createLegalAcceptance.isPending}
          legalBundle={session.legalBundle}
          mutationError={createLegalAcceptance.error?.message ?? null}
          onBack={() => setActiveStep('contact')}
          onComplete={async () => {
            await createLegalAcceptance.mutateAsync();
            router.replace(routes.overview);
            router.refresh();
          }}
        />
      )}
    </OnboardingFrame>
  );
}

export function onboardingFlowKey(session: OrganizationSession) {
  return [
    session.profile?.updatedAt ?? 'no-profile',
    session.readiness.ready ? 'ready' : 'open',
    session.legalAcceptance?.acceptedAt ?? 'no-legal',
    session.legalBundle.version,
  ].join(':');
}

function resolveInitialStep(
  session: OrganizationSession,
): OnboardingStepId {
  if (session.readiness.ready) {
    return 'agreements';
  }

  if (!session.profile) {
    return 'company';
  }

  return 'agreements';
}

function completedStepsFor(
  session: OrganizationSession,
  activeStep: OnboardingStepId,
): OnboardingStepId[] {
  const completed: OnboardingStepId[] = ['organization'];

  if (
    session.profile ||
    activeStep === 'contact' ||
    activeStep === 'agreements'
  ) {
    completed.push('company');
  }

  if (session.profile || activeStep === 'agreements') {
    completed.push('contact');
  }

  if (session.readiness.legalCurrent) {
    completed.push('agreements');
  }

  return completed;
}
