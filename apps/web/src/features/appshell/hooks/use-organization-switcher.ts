"use client";

import {
  useAuth,
  useOrganization,
  useOrganizationList,
} from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import { useSidebar } from '@/components/ui/sidebar';
import {
  organizationSessionQueryKey,
  useOrganizationSession,
} from '@/features/onboarding/hooks/use-organization-session';
import { waitForClerkSessionPropagation } from '@/features/onboarding/session-propagation';
import { routes } from '@/lib/routes';

type OrganizationSwitcherMembership = {
  organization: {
    hasImage: boolean;
    id: string;
    imageUrl: string;
    name: string;
  };
};

type OrganizationSwitcherState = {
  activeOrganizationHasImage: boolean;
  activeOrganizationImageUrl: string | null;
  activeOrganizationName: string;
  canFinishSetup: boolean;
  currentOrganizationId: string | null | undefined;
  isMobile: boolean;
  memberships: OrganizationSwitcherMembership[];
  pendingOrganizationId: string | null;
  switchOrganization: (organizationId: string) => Promise<void>;
};

export function useOrganizationSwitcher(): OrganizationSwitcherState {
  const t = useTranslations('Chrome');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgId } = useAuth({ treatPendingAsSignedOut: false });
  const { organization: activeOrganization } = useOrganization();
  const { setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      pageSize: 20,
    },
  });
  const { isMobile, setOpenMobile } = useSidebar();
  const session = useOrganizationSession({
    enabled: Boolean(orgId),
  });
  const [pendingOrganizationId, setPendingOrganizationId] = useState<
    string | null
  >(null);
  const memberships = (userMemberships.data ?? []).map((membership) => ({
    organization: {
      hasImage: membership.organization.hasImage,
      id: membership.organization.id,
      imageUrl: membership.organization.imageUrl,
      name: membership.organization.name,
    },
  }));
  const activeMembership = memberships.find(
    (membership) => membership.organization.id === orgId,
  );
  const activeOrganizationName =
    session.data?.organization.name ??
    activeOrganization?.name ??
    activeMembership?.organization.name ??
    t('selectOrganization');
  const activeOrganizationHasImage =
    activeOrganization?.hasImage ??
    activeMembership?.organization.hasImage ??
    false;
  const activeOrganizationImageUrl =
    activeOrganization?.imageUrl ?? activeMembership?.organization.imageUrl ?? null;
  const canFinishSetup =
    session.isSuccess &&
    !session.data.readiness.setupComplete &&
    canManageOrganizationSetup(session.data.organization.role);

  async function switchOrganization(organizationId: string) {
    if (!setActive || organizationId === orgId) {
      return;
    }

    setPendingOrganizationId(organizationId);

    try {
      await setActive({ organization: organizationId });
      await waitForClerkSessionPropagation();
      await queryClient.invalidateQueries({
        queryKey: organizationSessionQueryKey,
      });
      setOpenMobile(false);
      router.replace(routes.overview);
      router.refresh();
    } finally {
      setPendingOrganizationId(null);
    }
  }

  return {
    activeOrganizationHasImage,
    activeOrganizationImageUrl,
    activeOrganizationName,
    canFinishSetup,
    currentOrganizationId: orgId,
    isMobile,
    memberships,
    pendingOrganizationId,
    switchOrganization,
  };
}
