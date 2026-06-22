"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import {
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { useActiveOrganizationBootstrap } from '../hooks/use-active-organization-bootstrap';
import { useOrganizationSession } from '../hooks/use-organization-session';
import { OnboardingItem } from './onboarding-item';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const t = useTranslations('Onboarding');
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
        eyebrow={t('gateOrganizationErrorEyebrow')}
        title={t('gateOrganizationErrorTitle')}
      />
    );
  }

  if (shouldShowSetupPending) {
    return (
      <GateState
        description={t('gateSetupPendingDescription')}
        eyebrow={t('setupPendingEyebrow')}
        title={t('gateSetupPendingTitle')}
      />
    );
  }

  if (session.isError && !hasMissingActiveOrganization) {
    return (
      <GateState
        description={t('refreshAndTryAgain')}
        eyebrow={t('workspaceUnavailableEyebrow')}
        title={t('workspaceUnavailableTitle')}
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
  const t = useTranslations('Onboarding');

  return (
    <div className="grid flex-1 place-items-center bg-background">
      <LoadingState label={t('loadingWorkspace')} />
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
  const t = useTranslations('Onboarding');

  return (
    <section className="border-b bg-amber-50/70 px-5 py-3 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-3 gap-y-1">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-4 text-amber-600"
          />
          <p className={cn('min-w-0 text-amber-950 dark:text-amber-100', textStyles.h3)}>
            {t('legalUpdateTitle')}
          </p>
          <p className={cn('col-start-2 min-w-0', textStyles.p, 'text-amber-900 dark:text-amber-100')}>
            {canManageSetup
              ? t('legalUpdateManageDescription')
              : t('legalUpdateMemberDescription')}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={routes.legal}>
            <FileText aria-hidden="true" data-icon="inline-start" />
            {canManageSetup ? t('reviewUpdates') : t('viewLegal')}
          </Link>
        </Button>
      </div>
    </section>
  );
}
