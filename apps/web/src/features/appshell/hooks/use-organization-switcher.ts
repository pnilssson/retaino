"use client";

import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import { useSidebar } from '@/components/ui/sidebar';
import {
  organizationSessionQueryKey,
  useOrganizationSession,
} from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';

type OrganizationSwitcherMembership = {
  organization: {
    id: string;
    name: string;
  };
};

type OrganizationSwitcherState = {
  activeOrganizationName: string;
  canFinishSetup: boolean;
  currentOrganizationId: string | null | undefined;
  isMobile: boolean;
  memberships: OrganizationSwitcherMembership[];
  pendingOrganizationId: string | null;
  switchOrganization: (organizationId: string) => Promise<void>;
};

export function useOrganizationSwitcher(): OrganizationSwitcherState {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgId } = useAuth({ treatPendingAsSignedOut: false });
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
      id: membership.organization.id,
      name: membership.organization.name,
    },
  }));
  const activeOrganizationName =
    session.data?.organization.name ??
    memberships.find((membership) => membership.organization.id === orgId)
      ?.organization.name ??
    'Select organization';
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
    activeOrganizationName,
    canFinishSetup,
    currentOrganizationId: orgId,
    isMobile,
    memberships,
    pendingOrganizationId,
    switchOrganization,
  };
}

function waitForClerkSessionPropagation() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });
}
