"use client";

import { OrganizationCreateForm } from './organization-create-form';
import { OnboardingFrame } from './onboarding-frame';

export function OrganizationNewScreen() {
  return (
    <OnboardingFrame completedSteps={[]} currentStep="organization">
      <OrganizationCreateForm
        description="Set up a place for your team to manage contacts, campaigns, permissions, and results together."
        submitLabel="Create workspace"
        title="Create another workspace"
      />
    </OnboardingFrame>
  );
}
