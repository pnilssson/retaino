import type { CSSProperties, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export type GuidedFlowStep<StepId extends string = string> = {
  id: StepId;
  title: string;
};

type GuidedFlowFrameProps<StepId extends string> = {
  children: ReactNode;
  completedStepIds: StepId[];
  currentStepId: StepId;
  progressLabel: string;
  steps: GuidedFlowStep<StepId>[];
};

export function GuidedFlowFrame<StepId extends string>({
  children,
  completedStepIds,
  currentStepId,
  progressLabel,
  steps,
}: GuidedFlowFrameProps<StepId>) {
  const currentIndex = Math.max(
    steps.findIndex((step) => step.id === currentStepId),
    0,
  );
  const completed = new Set(completedStepIds);

  return (
    <div className="grid min-w-0 gap-3">
      <GuidedFlowSteps
        completed={completed}
        currentIndex={currentIndex}
        currentStepId={currentStepId}
        progressLabel={progressLabel}
        steps={steps}
      />

      <div className="grid min-w-0 content-start gap-5">{children}</div>
    </div>
  );
}

function GuidedFlowSteps<StepId extends string>({
  completed,
  currentIndex,
  currentStepId,
  progressLabel,
  steps,
}: {
  completed: Set<StepId>;
  currentIndex: number;
  currentStepId: StepId;
  progressLabel: string;
  steps: GuidedFlowStep<StepId>[];
}) {
  return (
    <nav className="grid min-w-0 gap-2" aria-label={progressLabel}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className={cn('uppercase', textStyles.metaStrong)}>
          {progressLabel}
        </p>
        <p className={textStyles.meta}>
          {currentIndex + 1}/{steps.length}
        </p>
      </div>
      <ol
        className="grid min-w-0 grid-cols-[repeat(var(--step-count),minmax(0,1fr))] gap-1.5"
        style={{ '--step-count': steps.length } as CSSProperties}
      >
        {steps.map((step) => {
          const isComplete = completed.has(step.id) && step.id !== currentStepId;
          const isCurrent = step.id === currentStepId;

          return (
            <li className="min-w-0" key={step.id}>
              <span className="sr-only">
                {step.title}
                {isCurrent ? ', current step' : isComplete ? ', completed' : ''}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'block h-1.5 rounded-full bg-muted',
                  isComplete ? 'bg-foreground/45' : '',
                  isCurrent ? 'bg-foreground' : '',
                )}
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function GuidedFlowSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <h2 className={textStyles.sectionTitle}>{title}</h2>
        {description ? (
          <p className={textStyles.mutedBody}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function GuidedFlowActions({
  backLabel = 'Back',
  canContinue = true,
  children,
  continueLabel = 'Continue',
  isPending = false,
  onBack,
  onContinue,
}: {
  backLabel?: string;
  canContinue?: boolean;
  children?: ReactNode;
  continueLabel?: string;
  isPending?: boolean;
  onBack?: () => void;
  onContinue?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <div>
        {onBack ? (
          <Button onClick={onBack} type="button" variant="outline">
            {backLabel}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {children}
        {onContinue ? (
          <Button disabled={!canContinue || isPending} onClick={onContinue} type="button">
            {continueLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
