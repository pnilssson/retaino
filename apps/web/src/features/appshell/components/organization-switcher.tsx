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
  const { isMobile, setOpenMobile } = useSidebar();
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
              className="h-12 px-2"
              tooltip="Switch organization"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
                <Building2
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={1.5}
                />
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="text-xs text-sidebar-foreground/60">
                  Organization
                </span>
                <span className="truncate font-medium">
                  {activeOrganizationName}
                </span>
              </span>
              <ChevronsUpDown
                aria-hidden="true"
                className="ml-auto size-4"
                strokeWidth={1.5}
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-64 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>
            {memberships.map((membership) => {
              const organization = membership.organization;
              const isActive = organization.id === orgId;
              const isPending = pendingOrganizationId === organization.id;

              return (
                <DropdownMenuItem
                  className="gap-2 p-2"
                  disabled={isPending}
                  key={organization.id}
                  onSelect={() => void switchOrganization(organization.id)}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-medium">
                    {initialsFor(organization.name)}
                  </span>
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate font-medium">
                      {organization.name}
                    </span>
                    {isActive ? (
                      <span className="text-xs text-muted-foreground">
                        Active organization
                      </span>
                    ) : null}
                  </span>
                  {isPending ? (
                    <Loader2
                      aria-hidden="true"
                      className="ml-auto size-4 animate-spin"
                    />
                  ) : isActive ? (
                    <Check aria-hidden="true" className="ml-auto size-4" />
                  ) : null}
                </DropdownMenuItem>
              );
            })}
            {memberships.length === 0 ? (
              <DropdownMenuItem className="gap-2 p-2" disabled>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background">
                  <Building2 aria-hidden="true" className="size-4" />
                </span>
                <span className="text-muted-foreground">
                  No organizations found
                </span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" asChild>
              <Link href={routes.organizationNew}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background">
                  <Plus aria-hidden="true" className="size-4" />
                </span>
                <span className="font-medium">Create organization</span>
              </Link>
            </DropdownMenuItem>
            {canFinishSetup ? (
              <DropdownMenuItem className="gap-2 p-2" asChild>
                <Link href={routes.organizationSetup}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background">
                    <Settings2 aria-hidden="true" className="size-4" />
                  </span>
                  <span className="font-medium">Finish setup</span>
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function initialsFor(value: string) {
  const [first = '', second = ''] = value.trim().split(/\s+/);
  const initials = `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();

  return initials || 'OR';
}

function waitForClerkSessionPropagation() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });
}
