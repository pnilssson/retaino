"use client";

import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import type { BillingPlanKey } from '@retaino/shared/contracts';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import { AppPageLoading } from '@/features/appshell/components/app-page-loading';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { useApi } from '@/hooks/use-api';
import { useSmsSender } from '@/hooks/use-sms-sender';
import {
  createBillingPortalSession,
  createSubscriptionCheckout,
  fetchBillingStatus,
} from '../billing-api';
import { billingQueryKeys } from '../billing-query-keys';
import { BillingPlanList } from './billing-plan-list';
import { BillingStatusPanel } from './billing-status-panel';

export function BillingScreen({ showSuccess }: { showSuccess?: boolean }) {
  const api = useApi();
  const session = useOrganizationSession();
  const organizationId = session.data?.organization.id ?? null;
  const billingStatus = useQuery({
    enabled: Boolean(organizationId),
    queryKey: billingQueryKeys.status(organizationId ?? 'pending'),
    queryFn: () => fetchBillingStatus(api),
  });
  const sender = useSmsSender(organizationId);

  const subscriptionCheckout = useMutation({
    mutationFn: (planKey: BillingPlanKey) =>
      createSubscriptionCheckout(api, planKey),
    onSuccess: redirectToCheckout,
  });
  const portal = useMutation({
    mutationFn: () => createBillingPortalSession(api),
    onSuccess: redirectToCheckout,
  });
  const actionError = subscriptionCheckout.error ?? portal.error;

  useEffect(() => {
    if (showSuccess) {
      toast.success('Checkout completed.', {
        id: 'billing-checkout-completed',
      });
    }
  }, [showSuccess]);

  if (session.isLoading) {
    return <AppPageLoading />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title="Billing could not be loaded"
            variant="error"
          />
        </div>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  const canManageBilling = canManageOrganizationSetup(
    session.data.organization.role,
  );

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          description="Choose a plan and manage payment details."
          eyebrow="Billing"
          title="Billing"
        />

        <div className="grid gap-5">
          {actionError ? (
            <ItemNotice
              description={
                actionError instanceof Error
                  ? actionError.message
                  : 'Try the billing action again.'
              }
              title="Billing action failed"
              variant="error"
            />
          ) : null}

          {!canManageBilling ? (
            <ItemNotice
              description="You can view billing status, but only organization admins can start checkout or manage payment details."
              title="Admin access required for billing changes"
              variant="warning"
            />
          ) : null}

          {billingStatus.isError ? (
            <ItemNotice
              description={
                billingStatus.error instanceof Error
                  ? billingStatus.error.message
                  : 'Try again in a moment.'
              }
              title="Billing status could not be loaded"
              variant="error"
            />
          ) : billingStatus.isLoading || !billingStatus.data ? (
            <LoadingState className="py-6" label="Loading billing status" />
          ) : (
            <>
              <BillingStatusPanel
                billingStatus={billingStatus.data}
                canManageBilling={canManageBilling}
                isPortalPending={portal.isPending}
                onOpenPortal={() => portal.mutate()}
                sender={sender.data?.sender ?? null}
              />
              <BillingPlanList
                billingStatus={billingStatus.data}
                canManageBilling={canManageBilling}
                isPortalPending={portal.isPending}
                onOpenPortal={() => portal.mutate()}
                onSelectPlan={(planKey) => subscriptionCheckout.mutate(planKey)}
                pendingPlanKey={
                  subscriptionCheckout.isPending
                    ? subscriptionCheckout.variables ?? null
                    : null
                }
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function redirectToCheckout(response: { url: string }) {
  window.location.assign(response.url);
}
