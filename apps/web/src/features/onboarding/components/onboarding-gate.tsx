"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { useActiveOrganizationBootstrap } from '../hooks/use-active-organization-bootstrap';
import { useOrganizationSession } from '../hooks/use-organization-session';

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
    session.isSuccess && session.data.readiness.ready === false;
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
    return (
      <div className="flex flex-1 flex-col bg-background">
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="max-w-xl">
            <p className="text-sm text-muted-foreground">Organization setup</p>
            <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
              Checking workspace access.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Retaino is checking organization readiness.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (organizationBootstrap.error) {
    return (
      <div className="flex flex-1 flex-col bg-background">
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="max-w-xl">
            <p className="text-sm text-muted-foreground">Organization error</p>
            <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
              Retaino could not prepare the active organization.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {organizationBootstrap.error.message}
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (shouldShowSetupPending) {
    return (
      <div className="flex flex-1 flex-col bg-background">
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="max-w-xl">
            <p className="text-sm text-muted-foreground">Setup pending</p>
            <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
              This workspace is still being set up.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              An organization admin needs to finish setup before members can
              use Retaino. You can switch to another organization from the
              sidebar.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (session.isError && !hasMissingActiveOrganization) {
    return (
      <div className="flex flex-1 flex-col bg-background">
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="max-w-xl">
            <p className="text-sm text-muted-foreground">Workspace unavailable</p>
            <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
              Retaino could not load this workspace.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Refresh the page and try again.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return children;
}
