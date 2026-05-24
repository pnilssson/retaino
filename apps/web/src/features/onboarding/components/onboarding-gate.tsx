"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import { AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { useActiveOrganizationBootstrap } from '../hooks/use-active-organization-bootstrap';
import { useOrganizationSession } from '../hooks/use-organization-session';
import { OnboardingItem } from './onboarding-item';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const organizationBootstrap = useActiveOrganizationBootstrap();
  const session = useOrganizationSession({
    enabled: organizationBootstrap.isReady,
  });

  const hasMissingActiveOrganization =
    session.isError &&
    session.error instanceof ApiClientError &&
    session.error.code === 'active_organization_required';
  const hasIncompleteOnboarding =
    session.isSuccess && session.data.readiness.setupComplete === false;
  const hasLegalUpdatesRequired =
    session.isSuccess && session.data.readiness.legalUpdatesRequired;
  const canManageSetup =
    session.isSuccess &&
    canManageOrganizationSetup(session.data.organization.role);
  const shouldRouteToOrganizationEntry =
    organizationBootstrap.needsOrganization || hasMissingActiveOrganization;
  const shouldRouteToSetup =
    !shouldRouteToOrganizationEntry && hasIncompleteOnboarding && canManageSetup;
  const shouldShowSetupPending =
    !shouldRouteToOrganizationEntry &&
    hasIncompleteOnboarding &&
    !canManageSetup;

  useEffect(() => {
    if (shouldRouteToOrganizationEntry) {
      router.replace(routes.organizationSetup);
      return;
    }

    if (shouldRouteToSetup) {
      router.replace(routes.organizationSetup);
    }
  }, [router, shouldRouteToOrganizationEntry, shouldRouteToSetup]);

  if (
    shouldRouteToOrganizationEntry ||
    shouldRouteToSetup ||
    !organizationBootstrap.isLoaded ||
    organizationBootstrap.isBootstrapping ||
    (!organizationBootstrap.isReady && !organizationBootstrap.error) ||
    session.isLoading
  ) {
    return <GateLoader />;
  }

  if (organizationBootstrap.error) {
    return (
      <GateState
        description={organizationBootstrap.error.message}
        eyebrow="Organization error"
        title="Retaino could not prepare the active organization."
      />
    );
  }

  if (shouldShowSetupPending) {
    return (
      <GateState
        description="An organization admin needs to finish setup before members can use Retaino. You can switch to another organization from the sidebar."
        eyebrow="Setup pending"
        title="This workspace is still being set up."
      />
    );
  }

  if (session.isError && !hasMissingActiveOrganization) {
    return (
      <GateState
        description="Refresh the page and try again."
        eyebrow="Workspace unavailable"
        title="Retaino could not load this workspace."
      />
    );
  }

  return (
    <>
      {hasLegalUpdatesRequired ? (
        <LegalUpdatesBanner canManageSetup={canManageSetup} />
      ) : null}
      {children}
    </>
  );
}

function GateLoader() {
  return (
    <div className="grid flex-1 place-items-center bg-background">
      <LoadingState label="Loading workspace" />
    </div>
  );
}

function GateState({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <OnboardingItem
          description={description}
          eyebrow={eyebrow}
          title={title}
        />
      </section>
    </div>
  );
}

function LegalUpdatesBanner({ canManageSetup }: { canManageSetup: boolean }) {
  return (
    <section className="border-b bg-amber-50/70 px-5 py-3 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-3 gap-y-1">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-4 text-amber-600"
          />
          <p className="min-w-0 text-sm font-medium">
            Legal agreement needs review
          </p>
          <p className="col-start-2 min-w-0 text-sm leading-6 text-amber-900 dark:text-amber-100">
            {canManageSetup
              ? 'Updated terms must be accepted before imports or campaigns can continue.'
              : 'Updated terms require acceptance by an organization admin before imports or campaigns can continue.'}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={routes.legal}>
            <FileText aria-hidden="true" data-icon="inline-start" />
            {canManageSetup ? 'Review updates' : 'View legal'}
          </Link>
        </Button>
      </div>
    </section>
  );
}
