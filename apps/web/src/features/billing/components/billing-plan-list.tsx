"use client";

import {
  BILLING_PLAN_CATALOG,
  BILLING_PLAN_KEYS,
  hasCurrentBillingSubscription,
  type BillingPlanKey,
  type BillingStatusResponse,
} from '@retaino/shared/contracts';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { AppPageItem } from '@/features/appshell/components/app-page-content';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { formatCreditCount, formatSek, formatUnitSek } from '../billing-format';

const PLAN_VIEW = {
  starter: {
    cta: 'Start first campaign',
    description: 'For a first reactivation test.',
  },
  growth: {
    cta: 'Start with Growth',
    description: 'Best for regular monthly campaigns.',
  },
  scale: {
    cta: 'Start with Scale',
    description: 'For larger lists or several campaigns.',
  },
} as const satisfies Record<
  BillingPlanKey,
  {
    cta: string;
    description: string;
  }
>;

const SHARED_PLAN_FEATURES = [
  'Unlimited users',
  'Unlimited contacts and imports',
  'Unlimited campaign drafts',
  'Campaign sending',
  'Tracking links',
  'Basic reporting',
] as const;

export function BillingPlanList({
  billingStatus,
  canManageBilling,
  isPortalPending,
  onSelectPlan,
  onOpenPortal,
  pendingPlanKey,
}: {
  billingStatus: BillingStatusResponse;
  canManageBilling: boolean;
  isPortalPending: boolean;
  onSelectPlan: (planKey: BillingPlanKey) => void;
  onOpenPortal: () => void;
  pendingPlanKey: BillingPlanKey | null;
}) {
  const subscriptionLocked = subscriptionNeedsPortal(
    billingStatus.subscription.status,
  );
  const hasCurrentSubscription = hasCurrentBillingSubscription(
    billingStatus.subscription.status,
  );

  return (
    <section className="grid gap-5" aria-labelledby="billing-plans-title">
      <header className="grid gap-1.5">
        <h2 className={textStyles.sectionTitle} id="billing-plans-title">
          Compare monthly plans
        </h2>
        <p className={cn('max-w-3xl', textStyles.mutedBody)}>
          All plans include campaign creation, contact imports, tracking links,
          and reporting. Higher plans include more monthly SMS credits. Prices
          are ex VAT, tax is calculated in checkout, and there are no surprise
          usage invoices.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {BILLING_PLAN_KEYS.map((planKey) => {
          const plan = BILLING_PLAN_CATALOG[planKey];
          const view = PLAN_VIEW[planKey];
          const isRecommendedPlan = planKey === 'growth';
          const isCurrentPlan =
            hasCurrentSubscription && billingStatus.subscription.planKey === planKey;
          const isSelectedPlan =
            isCurrentPlan || (!hasCurrentSubscription && isRecommendedPlan);
          const isPending = pendingPlanKey === planKey;
          const actionLabel = planActionLabel({
            isCurrentPlan,
            isPending,
            isPortalPending,
            planCta: view.cta,
            subscriptionLocked,
          });
          const buttonDisabled =
            !canManageBilling ||
            isCurrentPlan ||
            Boolean(pendingPlanKey) ||
            (subscriptionLocked &&
              (!billingStatus.portalAvailable || isPortalPending));

          return (
            <AppPageItem
              asChild
              className={cn(
                'content-between',
                isSelectedPlan &&
                  'border-primary bg-primary text-primary-foreground',
              )}
              key={planKey}
            >
              <article>
                <div className="grid gap-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={textStyles.sectionTitle}>{plan.label}</h3>
                    {isRecommendedPlan ? (
                      <StatusBadge
                        className={cn(
                          isSelectedPlan &&
                            'border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground',
                        )}
                        label="Recommended"
                        tone="blue"
                      />
                    ) : null}
                    {isCurrentPlan ? (
                      <StatusBadge
                        className={cn(
                          isSelectedPlan &&
                            'border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground',
                        )}
                        label="Current"
                        tone="green"
                      />
                    ) : null}
                  </div>

                  <div>
                    <p className={textStyles.numeric}>
                      {formatSek(plan.monthlyPriceSek)}
                      <span
                        className={cn(
                          'font-normal',
                          textStyles.meta,
                          isSelectedPlan && 'text-primary-foreground/75',
                        )}
                      >
                        {' '}
                        / month
                      </span>
                    </p>
                    <p
                      className={cn(
                        'mt-2',
                        textStyles.mutedBody,
                        isSelectedPlan && 'text-primary-foreground/80',
                      )}
                    >
                      {view.description}
                    </p>
                    <p
                      className={cn(
                        'mt-3',
                        textStyles.body,
                        'font-medium',
                        isSelectedPlan && 'text-primary-foreground',
                      )}
                    >
                      Includes {formatCreditCount(plan.includedSmsCredits)} SMS credits
                      <span
                        className={cn(
                          'font-normal',
                          textStyles.meta,
                          isSelectedPlan && 'text-primary-foreground/75',
                        )}
                      >
                        {' '}
                        / month
                      </span>
                    </p>
                  </div>

                  <ul
                    className={cn(
                      'grid gap-2',
                      textStyles.mutedBody,
                      isSelectedPlan && 'text-primary-foreground/85',
                    )}
                  >
                    <PlanFeature isSelected={isSelectedPlan}>
                      {formatUnitSek(
                        plan.monthlyPriceSek / plan.includedSmsCredits,
                      )}{' '}
                      per SMS credit
                    </PlanFeature>
                    {SHARED_PLAN_FEATURES.map((feature) => (
                      <PlanFeature isSelected={isSelectedPlan} key={feature}>
                        {feature}
                      </PlanFeature>
                    ))}
                  </ul>
                </div>

                <Button
                  className={cn(
                    'w-full',
                    isSelectedPlan &&
                      'bg-primary-foreground text-primary hover:bg-primary-foreground/90 hover:text-primary',
                  )}
                  disabled={buttonDisabled}
                  onClick={() => {
                    if (subscriptionLocked) {
                      onOpenPortal();
                      return;
                    }

                    onSelectPlan(planKey);
                  }}
                  type="button"
                >
                  {isCurrentPlan ? (
                    <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
                  ) : (
                    <ArrowRight aria-hidden="true" data-icon="inline-start" />
                  )}
                  {actionLabel}
                </Button>
              </article>
            </AppPageItem>
          );
        })}
      </div>
    </section>
  );
}

function planActionLabel({
  isCurrentPlan,
  isPending,
  isPortalPending,
  planCta,
  subscriptionLocked,
}: {
  isCurrentPlan: boolean;
  isPending: boolean;
  isPortalPending: boolean;
  planCta: string;
  subscriptionLocked: boolean;
}) {
  if (isPending) {
    return 'Opening checkout';
  }

  if (isCurrentPlan) {
    return 'Current plan';
  }

  if (subscriptionLocked) {
    return isPortalPending ? 'Opening Stripe' : 'Manage in Stripe';
  }

  return planCta;
}

function subscriptionNeedsPortal(
  status: BillingStatusResponse['subscription']['status'],
) {
  return ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'].includes(
    status,
  );
}

function PlanFeature({
  children,
  isSelected,
}: {
  children: ReactNode;
  isSelected: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-4 shrink-0 text-foreground',
          isSelected && 'text-primary-foreground',
        )}
      />
      <span>{children}</span>
    </li>
  );
}
