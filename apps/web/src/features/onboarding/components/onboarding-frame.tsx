import type { ReactNode } from 'react';
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
          progressLabel="Retaino setup"
          steps={steps}
        >
          {children}
        </GuidedFlowFrame>
      </section>
    </main>
  );
}
