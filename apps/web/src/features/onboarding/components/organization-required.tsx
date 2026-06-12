"use client";

import { useOrganizationList } from '@clerk/nextjs';
import {
  Building2,
  Loader2,
  Plus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useState } from 'react';
import { GuidedFlowActions } from '@/components/guided-flow';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { ItemTitle } from '@/components/ui/item';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { waitForClerkSessionPropagation } from '../session-propagation';
import { OrganizationCreateForm } from './organization-create-form';
import {
  OnboardingFrame,
  OnboardingLoading,
} from './onboarding-frame';
import { OnboardingItem } from './onboarding-item';

export function OrganizationRequired() {
  const t = useTranslations('Onboarding');
  const router = useRouter();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      pageSize: 20,
    },
  });
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const memberships = userMemberships.data ?? [];
  const hasExistingOrganizations = memberships.length > 0;
  const isBusy = Boolean(pendingOrganizationId) || userMemberships.isLoading;

  async function activateOrganization(organizationId: string) {
    if (!setActive) {
      setError(t('workspaceSelectionLoadingError'));
      return;
    }

    setError(null);
    setPendingOrganizationId(organizationId);

    try {
      await setActive({ organization: organizationId });
      await waitForClerkSessionPropagation();
      router.replace(routes.organizationSetup);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t('workspaceSelectError'),
      );
    } finally {
      setPendingOrganizationId(null);
    }
  }

  if (!isLoaded) {
    return (
      <OnboardingLoading
        currentStep="organization"
        label={t('loadingWorkspaceSetup')}
      />
    );
  }

  if (!hasExistingOrganizations) {
    return (
      <OnboardingFrame completedSteps={[]} currentStep="organization">
        <OrganizationCreateForm
          description={t('workspaceSharedDescription')}
          notice={
            error ? (
              <ItemNotice
                description={error}
                title={t('workspaceSelectErrorTitle')}
                variant="error"
              />
            ) : null
          }
          title={t('setupWorkspaceTitle')}
        />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame completedSteps={[]} currentStep="organization">
      <div className="grid gap-5">
        <OnboardingItem
          description={t('chooseWorkspaceDescription')}
          eyebrow={t('workspaceEyebrow')}
          title={t('chooseWorkspaceTitle')}
        >
          {error ? (
            <ItemNotice
              description={error}
              title={t('workspaceSelectErrorTitle')}
              variant="error"
            />
          ) : null}

          <div className="border-y py-5">
            <ItemTitle>{t('yourWorkspaces')}</ItemTitle>
            <div className="mt-4 grid gap-2">
              {memberships.map((membership) => (
                <Button
                  className="h-auto justify-start gap-3 px-3 py-3 text-left"
                  disabled={isBusy}
                  key={membership.organization.id}
                  onClick={() =>
                    void activateOrganization(membership.organization.id)
                  }
                  type="button"
                  variant="outline"
                >
                  {pendingOrganizationId === membership.organization.id ? (
                    <Loader2
                      aria-hidden="true"
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <Building2 aria-hidden="true" data-icon="inline-start" />
                  )}
                  <span className="min-w-0 truncate">
                    {membership.organization.name}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <p className={textStyles.mutedBody}>
            {t('inviteCopy')}
          </p>
        </OnboardingItem>
        <GuidedFlowActions>
          <Button asChild variant="outline">
            <Link href={routes.organizationNew}>
              <Plus aria-hidden="true" data-icon="inline-start" />
              {t('createAnotherWorkspace')}
            </Link>
          </Button>
        </GuidedFlowActions>
      </div>
    </OnboardingFrame>
  );
}
