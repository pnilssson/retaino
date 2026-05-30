"use client";

import type { ReactNode } from 'react';
import type {
  BillingStatusResponse,
  PublicOrganizationSmsSender,
} from '@retaino/shared/contracts';
import { ExternalLink } from 'lucide-react';
import { InfoTooltip } from '@/components/info-tooltip';
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
  const senderTooltip = senderPolicyNotice(subscription, sender);

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
            >
              <ExternalLink aria-hidden="true" data-icon="inline-start" />
              {isPortalPending ? 'Opening' : 'Manage'}
            </Button>
      }
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
            tooltip={
              senderTooltip ? (
                <span>{senderTooltip}</span>
              ) : null
            }
            value={sender?.phoneNumber ?? 'Not active'}
          />
        </dl>
    </ContentSection>
  );
}

function Metric({
  label,
  tooltip,
  value,
}: {
  label: string;
  tooltip?: ReactNode;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className={cn('flex items-center gap-1.5', textStyles.meta)}>
        {label}
        {tooltip ? (
          <InfoTooltip label={`${label} details`}>{tooltip}</InfoTooltip>
        ) : null}
      </dt>
      <dd className={cn('mt-1 truncate', textStyles.numericInline)}>
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
): string | null {
  if (sender?.status !== 'ready') {
    return null;
  }

  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    return `Your sender remains active until ${formatBillingDate(subscription.currentPeriodEnd)}. After that, Retaino releases the number.`;
  }

  return 'If the plan is canceled, Retaino releases this sender number after paid access ends.';
}
