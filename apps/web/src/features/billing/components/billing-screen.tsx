"use client";

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  canManageOrganizationSetup,
  hasCurrentBillingSubscription,
} from '@retaino/shared/contracts';
import type { BillingPlanKey, CreditPackKey } from '@retaino/shared/contracts';
import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { AppPageContent } from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { useApi } from '@/hooks/use-api';
import {
  createBillingPortalSession,
  createCreditCheckout,
  createSubscriptionCheckout,
  fetchBillingStatus,
} from '../billing-api';
import { billingQueryKeys } from '../billing-query-keys';
import { BillingPlanList } from './billing-plan-list';
import { BillingStatusPanel } from './billing-status-panel';
import { CreditPackList } from './credit-pack-list';

export function BillingScreen({ showSuccess }: { showSuccess?: boolean }) {
  const api = useApi();
  const session = useOrganizationSession();
  const organizationId = session.data?.organization.id ?? null;
  const billingStatus = useQuery({
    enabled: Boolean(organizationId),
    queryKey: billingQueryKeys.status(organizationId ?? 'pending'),
    queryFn: () => fetchBillingStatus(api),
  });

  const subscriptionCheckout = useMutation({
    mutationFn: (planKey: BillingPlanKey) =>
      createSubscriptionCheckout(api, planKey),
    onSuccess: redirectToCheckout,
  });
  const creditCheckout = useMutation({
    mutationFn: (packKey: CreditPackKey) => createCreditCheckout(api, packKey),
    onSuccess: redirectToCheckout,
  });
  const portal = useMutation({
    mutationFn: () => createBillingPortalSession(api),
    onSuccess: redirectToCheckout,
  });
  const actionError =
    subscriptionCheckout.error ?? creditCheckout.error ?? portal.error;

  useEffect(() => {
    if (showSuccess) {
      toast.success('Checkout completed.', {
        id: 'billing-checkout-completed',
      });
    }
  }, [showSuccess]);

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <p className="text-sm text-muted-foreground">Loading billing.</p>
        </section>
      </main>
    );
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
          actions={
            <Button
              onClick={() => {
                void billingStatus.refetch();
              }}
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" data-icon="inline-start" />
              Refresh
            </Button>
          }
          description="Choose a plan, buy extra credits, and manage payment details."
          eyebrow="Billing"
          title="Billing"
        />

        <AppPageContent>
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
                  : 'Try refreshing the page.'
              }
              title="Billing status could not be loaded"
              variant="error"
            />
          ) : billingStatus.isLoading || !billingStatus.data ? (
            <p className="text-sm text-muted-foreground">
              Loading billing status.
            </p>
          ) : (
            <>
              <BillingStatusPanel
                billingStatus={billingStatus.data}
                canManageBilling={canManageBilling}
                isPortalPending={portal.isPending}
                onOpenPortal={() => portal.mutate()}
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
              <CreditPackList
                canBuyCredits={hasCurrentBillingSubscription(
                  billingStatus.data.subscription.status,
                )}
                canManageBilling={canManageBilling}
                onSelectPack={(packKey) => creditCheckout.mutate(packKey)}
                pendingPackKey={
                  creditCheckout.isPending ? creditCheckout.variables ?? null : null
                }
              />
            </>
          )}
        </AppPageContent>
      </section>
    </main>
  );
}

function redirectToCheckout(response: { url: string }) {
  window.location.assign(response.url);
}
