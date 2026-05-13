"use client";

import {
  Building2,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Settings2
} from 'lucide-react';
import Link from 'next/link';
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
} from '@/components/ui/sidebar';
import { useOrganizationSwitcher } from '@/features/appshell/hooks/use-organization-switcher';
import { routes } from '@/lib/routes';

export function OrganizationSwitcher() {
  const {
    activeOrganizationName,
    canFinishSetup,
    currentOrganizationId,
    isMobile,
    memberships,
    pendingOrganizationId,
    switchOrganization,
  } = useOrganizationSwitcher();

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
              const isActive = organization.id === currentOrganizationId;
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
