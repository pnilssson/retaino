"use client";

import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Settings2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { routes } from '@/lib/routes';
import {
  organizationSessionQueryKey,
  useOrganizationSession
} from '@/features/onboarding/hooks/use-organization-session';

export function OrganizationSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgId } = useAuth({ treatPendingAsSignedOut: false });
  const { setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      pageSize: 20,
    },
  });
  const { setOpenMobile } = useSidebar();
  const session = useOrganizationSession({
    enabled: Boolean(orgId),
  });
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(
    null,
  );
  const memberships = userMemberships.data ?? [];
  const activeOrganizationName =
    session.data?.organization.name ??
    memberships.find((membership) => membership.organization.id === orgId)
      ?.organization.name ??
    'Select organization';
  const canFinishSetup =
    session.isSuccess &&
    !session.data.readiness.ready &&
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="h-11"
              tooltip="Switch organization"
            >
              <Building2 aria-hidden="true" strokeWidth={1.5} />
              <span>{activeOrganizationName}</span>
              <ChevronsUpDown
                aria-hidden="true"
                className="ml-auto"
                strokeWidth={1.5}
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width)"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {memberships.map((membership) => {
              const organization = membership.organization;
              const isActive = organization.id === orgId;
              const isPending = pendingOrganizationId === organization.id;

              return (
                <DropdownMenuItem
                  disabled={isPending}
                  key={organization.id}
                  onSelect={() => void switchOrganization(organization.id)}
                >
                  {isPending ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : isActive ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Building2 aria-hidden="true" />
                  )}
                  {organization.name}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={routes.organizationNew}>
                <Plus aria-hidden="true" />
                Create organization
              </Link>
            </DropdownMenuItem>
            {canFinishSetup ? (
              <DropdownMenuItem asChild>
                <Link href={routes.organizationSetup}>
                  <Settings2 aria-hidden="true" />
                  Finish setup
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function waitForClerkSessionPropagation() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });
}
