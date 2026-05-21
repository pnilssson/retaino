"use client";

import { OrganizationCreateForm } from './organization-create-form';
import { OnboardingFrame } from './onboarding-frame';
import { OnboardingItem } from './onboarding-item';

export function OrganizationNewScreen() {
  return (
    <OnboardingFrame completedSteps={[]} currentStep="organization">
      <OnboardingItem
        description="Set up a place for your team to manage contacts, campaigns, permissions, and results together."
        eyebrow="Workspace"
        title="Create another workspace."
      >
        <OrganizationCreateForm submitLabel="Create workspace" />
      </OnboardingItem>
    </OnboardingFrame>
  );
}
