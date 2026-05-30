import type { ReactNode } from 'react';
import { LoadingState } from '@/components/loading-state';
import { GuidedFlowFrame } from '@/components/guided-flow';

export type OnboardingStepId =
  | 'organization'
  | 'company'
  | 'contact'
  | 'agreements';

const steps: { id: OnboardingStepId; title: string }[] = [
  { id: 'organization', title: 'Organization' },
  { id: 'company', title: 'Company' },
  { id: 'contact', title: 'Contact' },
  { id: 'agreements', title: 'Legal' },
];

type OnboardingFrameProps = {
  children: ReactNode;
  completedSteps: OnboardingStepId[];
  currentStep: OnboardingStepId;
};

export function OnboardingFrame({
  children,
  completedSteps,
  currentStep,
}: OnboardingFrameProps) {
  return (
    <main className="flex flex-1 bg-background px-5 py-8 sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-5xl">
        <GuidedFlowFrame
          completedStepIds={completedSteps}
          currentStepId={currentStep}
          progressLabel="Organization setup"
          steps={steps}
        >
          {children}
        </GuidedFlowFrame>
      </section>
    </main>
  );
}

export function OnboardingLoading({
  completedSteps = [],
  currentStep,
  label,
}: {
  completedSteps?: OnboardingStepId[];
  currentStep: OnboardingStepId;
  label: string;
}) {
  return (
    <OnboardingFrame completedSteps={completedSteps} currentStep={currentStep}>
      <div className="flex min-h-[240px] items-center justify-center">
        <LoadingState label={label} />
      </div>
    </OnboardingFrame>
  );
}
