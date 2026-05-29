import type {
  CSSProperties,
  ReactNode,
} from 'react';
import { LoaderCircle } from 'lucide-react';
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
  currentStepId,
  progressLabel,
  steps,
}: GuidedFlowFrameProps<StepId>) {
  const currentIndex = Math.max(
    steps.findIndex((step) => step.id === currentStepId),
    0,
  );

  return (
    <div className="grid min-w-0 gap-3">
      <GuidedFlowSteps
        currentIndex={currentIndex}
        progressLabel={progressLabel}
        steps={steps}
      />

      <div className="grid min-w-0 content-start gap-5">{children}</div>
    </div>
  );
}

function GuidedFlowSteps<StepId extends string>({
  currentIndex,
  progressLabel,
  steps,
}: {
  currentIndex: number;
  progressLabel: string;
  steps: GuidedFlowStep<StepId>[];
}) {
  return (
    <nav className="grid min-w-0 gap-2" aria-label={progressLabel}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className={cn('uppercase', textStyles.meta)}>
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
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          const isReached = isPast || isCurrent;

          return (
            <li className="min-w-0" key={step.id}>
              <span className="sr-only">
                {step.title}
                {isCurrent ? ', current step' : isPast ? ', completed' : ''}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'block h-1.5 rounded-full bg-muted',
                  isReached ? 'bg-foreground' : '',
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
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h2 className={textStyles.itemTitle}>{title}</h2>
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
  continueIcon,
  continueLabel = 'Continue',
  isPending = false,
  onBack,
  onContinue,
}: {
  backLabel?: ReactNode;
  canContinue?: boolean;
  children?: ReactNode;
  continueIcon?: ReactNode;
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
          <Button
            disabled={!canContinue || isPending}
            onClick={onContinue}
            type="button"
          >
            {isPending ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : continueIcon ? (
              <span data-icon="inline-start">{continueIcon}</span>
            ) : null}
            {continueLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
