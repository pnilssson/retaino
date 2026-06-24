"use client";

import type { ReactNode } from 'react';
import type {
  BillingStatusResponse,
  PublicOrganizationSmsSender,
} from '@retaino/shared/contracts';
import { ExternalLink } from 'lucide-react';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
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
  const locale = useLocale();
  const t = useTranslations('Billing');
  const subscription = billingStatus.subscription;
  const status = subscriptionStatusView(subscription, t);
  const periodMetric = subscriptionPeriodMetric(subscription, locale, t);
  const senderTooltip = senderPolicyNotice(subscription, sender, locale, t);

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
          {isPortalPending ? t('portalOpening') : t('manageBilling')}
        </Button>
      }
      title={
        <span className="flex flex-wrap items-center gap-2">
          {t('accountSummary')}
          <StatusBadge label={status.label} tone={status.tone} />
        </span>
      }
    >
      <dl className="grid gap-x-8 gap-y-4 pt-1 sm:grid-cols-4">
        <Metric
          label={t('smsCredits')}
          value={formatCreditCount(billingStatus.smsCredits.balance, locale)}
        />
        <Metric
          label={t('currentPlan')}
          value={
            subscription.planKey ? planLabel(subscription.planKey) : t('noPlan')
          }
        />
        <Metric
          label={periodMetric.label}
          value={periodMetric.value}
        />
        <Metric
          label={t('senderNumber')}
          tooltipLabel={t('senderNumberDetails')}
          tooltip={senderTooltip ? <span>{senderTooltip}</span> : null}
          value={sender?.phoneNumber ?? t('senderNotActive')}
        />
      </dl>
    </ContentSection>
  );
}

function Metric({
  label,
  tooltip,
  tooltipLabel,
  value,
}: {
  label: string;
  tooltip?: ReactNode;
  tooltipLabel?: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className={cn('flex items-center gap-1.5', textStyles.small)}>
        {label}
        {tooltip ? (
          <InfoTooltip label={tooltipLabel}>{tooltip}</InfoTooltip>
        ) : null}
      </dt>
      <dd className={cn('mt-1 truncate', textStyles.smallNumber)}>
        {value}
      </dd>
    </div>
  );
}

type BillingTranslation = ReturnType<typeof useTranslations<'Billing'>>;

function subscriptionStatusView(
  subscription: BillingStatusResponse['subscription'],
  t: BillingTranslation,
): {
  label: string;
  tone: StatusBadgeTone;
} {
  if (
    subscription.cancelAtPeriodEnd &&
    (subscription.status === 'active' || subscription.status === 'trialing')
  ) {
    return { label: t('statusEnding'), tone: 'amber' };
  }

  switch (subscription.status) {
    case 'active':
      return { label: t('statusActive'), tone: 'green' };
    case 'trialing':
      return { label: t('statusTrialing'), tone: 'blue' };
    case 'past_due':
    case 'unpaid':
      return { label: t('statusPaymentNeeded'), tone: 'amber' };
    case 'canceled':
    case 'incomplete_expired':
      return { label: t('statusInactive'), tone: 'gray' };
    case 'incomplete':
    case 'paused':
      return { label: t('statusActionNeeded'), tone: 'amber' };
    case 'none':
      return { label: t('statusNoSubscription'), tone: 'gray' };
  }
}

function subscriptionPeriodMetric(
  subscription: BillingStatusResponse['subscription'],
  locale: string,
  t: BillingTranslation,
) {
  const formattedPeriodEnd = subscription.currentPeriodEnd
    ? formatBillingDate(subscription.currentPeriodEnd, locale)
    : null;

  if (
    subscription.cancelAtPeriodEnd &&
    (subscription.status === 'active' || subscription.status === 'trialing')
  ) {
    return {
      label: t('accessEnds'),
      value: formattedPeriodEnd ?? t('notScheduled'),
    };
  }

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return {
      label: t('renews'),
      value: formattedPeriodEnd ?? t('notScheduled'),
    };
  }

  if (!formattedPeriodEnd) {
    return {
      label: t('billingDate'),
      value: t('notScheduled'),
    };
  }

  return {
    label: t('ended'),
    value: formattedPeriodEnd,
  };
}

function planLabel(
  planKey: NonNullable<BillingStatusResponse['subscription']['planKey']>,
) {
  return `${planKey.charAt(0).toUpperCase()}${planKey.slice(1)}`;
}

function senderPolicyNotice(
  subscription: BillingStatusResponse['subscription'],
  sender: PublicOrganizationSmsSender | null,
  locale: string,
  t: BillingTranslation,
): string | null {
  if (sender?.status !== 'ready') {
    return null;
  }

  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    return t('senderReleaseAtPeriodEnd', {
      date: formatBillingDate(subscription.currentPeriodEnd, locale),
    });
  }

  return t('senderReleaseAfterCancel');
}
