"use client";

import type {
  BillingStatusResponse,
  PublicOrganizationSmsSender,
} from '@retaino/shared/contracts';
import { hasCurrentBillingSubscription } from '@retaino/shared/contracts';
import { ExternalLink } from 'lucide-react';
import { ItemNotice } from '@/components/item-notice';
import {
  StatusBadge,
  type StatusBadgeTone,
} from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { ContentSection } from '@/features/appshell/components/content-section';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import {
  formatBillingDate,
  formatCreditCount,
} from '../billing-format';

export function BillingStatusPanel({
  billingStatus,
  canManageBilling,
  isPortalPending,
  onOpenPortal,
  sender,
}: {
  billingStatus: BillingStatusResponse;
  canManageBilling: boolean;
  isPortalPending: boolean;
  onOpenPortal: () => void;
  sender: PublicOrganizationSmsSender | null;
}) {
  const subscription = billingStatus.subscription;
  const status = subscriptionStatusView(subscription.status);
  const senderPolicy = senderPolicyNotice(subscription, sender);

  return (
    <ContentSection
      actions={
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
              {isPortalPending ? 'Opening' : 'Manage'}
            </Button>
      }
      description="Current subscription access, renewal timing, and available SMS credits."
      title={
        <span className="flex flex-wrap items-center gap-2">
          Account summary
          <StatusBadge label={status.label} tone={status.tone} />
        </span>
      }
    >
        <dl className="grid gap-x-8 gap-y-4 pt-1 sm:grid-cols-4">
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
          <Metric
            label="Sender number"
            value={sender?.phoneNumber ?? 'Not active'}
          />
        </dl>
        <ItemNotice
          description={senderPolicy.description}
          title={senderPolicy.title}
          variant={senderPolicy.variant}
        />
    </ContentSection>
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
      <dd className={cn('mt-1 truncate tabular-nums', textStyles.itemTitle)}>
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

function senderPolicyNotice(
  subscription: BillingStatusResponse['subscription'],
  sender: PublicOrganizationSmsSender | null,
): {
  title: string;
  description: string;
  variant: 'info' | 'warning';
} {
  if (sender?.status === 'released') {
    return {
      title: 'No active sender number',
      description: 'Set up a new sender before sending SMS.',
      variant: 'warning',
    };
  }

  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    return {
      title: 'Sender active until plan end',
      description: `Your sender remains active until ${formatBillingDate(subscription.currentPeriodEnd)}. After that, Retaino releases the number.`,
      variant: 'warning',
    };
  }

  if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    return {
      title: 'Payment needed to keep sender',
      description: sender?.releaseScheduledAt
        ? `Update payment by ${formatBillingDate(sender.releaseScheduledAt)} to keep this sender number.`
        : 'Update payment soon to keep this sender number.',
      variant: 'warning',
    };
  }

  if (!hasCurrentBillingSubscription(subscription.status)) {
    return {
      title: sender ? 'Sender inactive' : 'No active sender number',
      description: sender
        ? 'Reactivate billing to keep using Retaino. If access has ended, Retaino releases the sender number.'
        : 'Choose a plan and set up a sender before sending SMS.',
      variant: 'warning',
    };
  }

  return {
    title: 'Sender number included',
    description:
      'Your sender number stays active while your subscription is active.',
    variant: 'info',
  };
}
