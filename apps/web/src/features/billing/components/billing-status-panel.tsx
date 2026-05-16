"use client";

import type { BillingStatusResponse } from '@retaino/shared/contracts';
import { ExternalLink } from 'lucide-react';
import { StatusBadge, type StatusBadgeTone } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { AppPageItem } from '@/features/appshell/components/app-page-content';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { formatBillingDate, formatCreditCount } from '../billing-format';

export function BillingStatusPanel({
  billingStatus,
  canManageBilling,
  isPortalPending,
  onOpenPortal,
}: {
  billingStatus: BillingStatusResponse;
  canManageBilling: boolean;
  isPortalPending: boolean;
  onOpenPortal: () => void;
}) {
  const subscription = billingStatus.subscription;
  const status = subscriptionStatusView(subscription.status);

  return (
    <AppPageItem asChild>
      <section>
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle
              className={cn(
                'flex flex-wrap items-center gap-2',
                textStyles.sectionTitle,
              )}
            >
              Account summary
              <StatusBadge label={status.label} tone={status.tone} />
            </ItemTitle>
            <ItemDescription>
              Current subscription access, renewal timing, and available SMS
              credits.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              disabled={
                !canManageBilling ||
                !billingStatus.portalAvailable ||
                isPortalPending
              }
              onClick={onOpenPortal}
              type="button"
              variant="outline"
            >
              <ExternalLink aria-hidden="true" data-icon="inline-start" />
              {isPortalPending ? 'Opening Stripe' : 'Manage in Stripe'}
            </Button>
          </ItemActions>
        </ItemHeader>

        <dl className="grid gap-x-8 gap-y-4 pt-1 sm:grid-cols-3">
          <Metric
            label="SMS credits"
            value={formatCreditCount(billingStatus.smsCredits.balance)}
          />
          <Metric
            label="Current plan"
            value={subscription.planKey ? planLabel(subscription.planKey) : 'No plan'}
          />
          <Metric
            label="Renews"
            value={
              subscription.currentPeriodEnd
                ? formatBillingDate(subscription.currentPeriodEnd)
                : 'Not scheduled'
            }
          />
        </dl>
      </section>
    </AppPageItem>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className={textStyles.meta}>{label}</dt>
      <dd className="mt-1 truncate text-xl font-semibold tracking-normal tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function subscriptionStatusView(status: BillingStatusResponse['subscription']['status']): {
  label: string;
  tone: StatusBadgeTone;
} {
  switch (status) {
    case 'active':
      return { label: 'Active', tone: 'green' };
    case 'trialing':
      return { label: 'Trialing', tone: 'blue' };
    case 'past_due':
    case 'unpaid':
      return { label: 'Payment needed', tone: 'amber' };
    case 'canceled':
    case 'incomplete_expired':
      return { label: 'Inactive', tone: 'gray' };
    case 'incomplete':
    case 'paused':
      return { label: 'Action needed', tone: 'amber' };
    case 'none':
      return { label: 'No subscription', tone: 'gray' };
  }
}

function planLabel(planKey: NonNullable<BillingStatusResponse['subscription']['planKey']>) {
  return `${planKey.charAt(0).toUpperCase()}${planKey.slice(1)}`;
}
