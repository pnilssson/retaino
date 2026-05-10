"use client";

import type { OrganizationSession } from '@retaino/shared/contracts';
import { useMemo, useState } from 'react';
import {
  organizationProfileFormValuesFromSession,
  organizationProfileFormValuesToUpdateInput,
  type OrganizationProfileFormValues as ProfileDraft,
} from '@/features/organization-profile/organization-profile-form';
import { useCreateCurrentOrganizationAcceptances } from '../hooks/use-create-current-organization-acceptances';
import { useUpdateOrganizationProfile } from '../hooks/use-update-organization-profile';
import { complianceDocumentLabels } from '../onboarding.constants';
import { AgreementsStep } from './agreements-step';
import { CompanyStep } from './company-step';
import { ContactStep } from './contact-step';
import { OnboardingFrame, type OnboardingStepId } from './onboarding-frame';
import { ReadyStep } from './setup-states';

export function OnboardingFlow({ session }: { session: OrganizationSession }) {
  const updateProfile = useUpdateOrganizationProfile();
  const createAcceptances = useCreateCurrentOrganizationAcceptances();
  const initialDraft = useMemo(
    () => organizationProfileFormValuesFromSession(session),
    [session],
  );
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(initialDraft);
  const [activeStep, setActiveStep] = useState<OnboardingStepId | 'ready'>(
    resolveInitialStep(session),
  );

  const completedSteps = completedStepsFor(session, activeStep);

  if (activeStep === 'ready') {
    return (
      <OnboardingFrame
        completedSteps={['organization', 'company', 'contact', 'agreements']}
        currentStep="agreements"
      >
        <ReadyStep organizationName={session.organization.name} />
      </OnboardingFrame>
    );
  }

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
            setActiveStep(
              session.readiness.complianceComplete ? 'ready' : 'agreements',
            );
          }}
        />
      ) : (
        <AgreementsStep
          documents={session.requiredLegalDocuments}
          isPending={createAcceptances.isPending}
          missingAcceptanceTypes={session.readiness.missingAcceptanceTypes}
          mutationError={createAcceptances.error?.message ?? null}
          onBack={() => setActiveStep('contact')}
          onComplete={async () => {
            await createAcceptances.mutateAsync({
              documents: session.requiredLegalDocuments.map((document) => ({
                documentType:
                  document.documentType as keyof typeof complianceDocumentLabels,
                documentVersion: document.documentVersion,
              })),
            });
            setActiveStep('ready');
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
    session.readiness.missingAcceptanceTypes.join(','),
  ].join(':');
}

function resolveInitialStep(
  session: OrganizationSession,
): OnboardingStepId | 'ready' {
  if (session.readiness.ready) {
    return 'ready';
  }

  if (!session.profile) {
    return 'company';
  }

  return 'agreements';
}

function completedStepsFor(
  session: OrganizationSession,
  activeStep: OnboardingStepId | 'ready',
): OnboardingStepId[] {
  const completed: OnboardingStepId[] = ['organization'];

  if (
    session.profile ||
    activeStep === 'contact' ||
    activeStep === 'agreements' ||
    activeStep === 'ready'
  ) {
    completed.push('company');
  }

  if (session.profile || activeStep === 'agreements' || activeStep === 'ready') {
    completed.push('contact');
  }

  if (session.readiness.complianceComplete || activeStep === 'ready') {
    completed.push('agreements');
  }

  return completed;
}
