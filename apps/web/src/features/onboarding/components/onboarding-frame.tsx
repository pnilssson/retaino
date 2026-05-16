import type { ReactNode } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export type OnboardingStepId =
  | 'organization'
  | 'company'
  | 'contact'
  | 'agreements';

const steps: { id: OnboardingStepId; title: string }[] = [
  { id: 'organization', title: 'Organization' },
  { id: 'company', title: 'Company' },
  { id: 'contact', title: 'Contact' },
  { id: 'agreements', title: 'Legal' }
];

type OnboardingFrameProps = {
  children: ReactNode;
  completedSteps: OnboardingStepId[];
  currentStep: OnboardingStepId;
};

export function OnboardingFrame({
  children,
  completedSteps,
  currentStep
}: OnboardingFrameProps) {
  const currentIndex = Math.max(
    steps.findIndex((step) => step.id === currentStep),
    0,
  );
  const currentTitle = steps[currentIndex]?.title ?? 'Setup';
  const completed = new Set(completedSteps);

  return (
    <main className="flex flex-1 bg-background px-5 py-8 sm:px-8 lg:px-10">
      <section className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[12rem_minmax(0,34rem)] lg:gap-16">
        <div className="lg:hidden">
          <p className={cn('uppercase', textStyles.metaStrong)}>
            Step {currentIndex + 1} of {steps.length}
          </p>
          <p className={cn('mt-1', textStyles.sectionTitle)}>{currentTitle}</p>
        </div>

        <aside className="hidden min-w-0 lg:block" aria-label="Setup progress">
          <p className="text-sm text-muted-foreground">Retaino setup</p>
          <ol className="mt-6 grid gap-4">
            {steps.map((step) => {
              const isComplete = completed.has(step.id);
              const isCurrent = step.id === currentStep;

              return (
                <li className="flex items-center gap-3" key={step.id}>
                  {isComplete ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 text-foreground"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <Circle
                      aria-hidden="true"
                      className={
                        isCurrent
                          ? 'size-4 text-foreground'
                          : 'size-4 text-muted-foreground'
                      }
                      strokeWidth={1.5}
                    />
                  )}
                  <span
                    className={
                      isCurrent
                        ? 'text-sm font-medium text-foreground'
                        : 'text-sm text-muted-foreground'
                    }
                  >
                    {step.title}
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="grid min-w-0 content-start gap-6">{children}</div>
      </section>
    </main>
  );
}
