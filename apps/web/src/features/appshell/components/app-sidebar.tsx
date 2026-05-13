"use client";

import { useClerk, useUser } from '@clerk/nextjs';
import {
  Building2,
  ChevronsUpDown,
  Cookie,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Shield,
  UserCircle,
  UsersRound
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import { useCookieConsent } from '@/features/cookies/hooks/use-cookie-consent';
import { routes } from '@/lib/routes';
import { OrganizationSwitcher } from './organization-switcher';

const navigationItems = [
  {
    title: 'Overview',
    href: routes.overview,
    icon: LayoutDashboard
  },
  {
    title: 'Contacts',
    href: routes.contacts,
    icon: UsersRound,
    children: [
      {
        title: 'All contacts',
        href: routes.contacts,
      },
      {
        title: 'Import contacts',
        href: routes.contactsImport,
      },
    ],
  },
  {
    title: 'Campaigns',
    href: routes.campaigns,
    icon: Megaphone
  },
];

const managementItems = [
  {
    title: 'Settings',
    href: routes.settings,
    icon: Building2
  }
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { openUserProfile, signOut } = useClerk();
  const { user } = useUser();
  const { openPreferences } = useCookieConsent();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const userName = user?.fullName ?? userEmail ?? 'Account';
  const userInitials = initialsFor(user?.fullName ?? userEmail);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavigationItemActive(pathname, item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon aria-hidden="true" strokeWidth={1.5} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.children ? (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.href}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isNavigationSubItemActive(
                              pathname,
                              child.href,
                            )}
                          >
                            <Link href={child.href}>{child.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon aria-hidden="true" strokeWidth={1.5} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12 px-2" tooltip={userName}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
                    {userInitials}
                  </span>
                  <span className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{userName}</span>
                  </span>
                  <ChevronsUpDown
                    aria-hidden="true"
                    className="ml-auto size-4"
                    strokeWidth={1.5}
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isMobile ? 'start' : 'end'}
                className="w-(--radix-dropdown-menu-trigger-width)"
                side={isMobile ? 'top' : 'right'}
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="grid gap-1 px-1 py-1.5 text-left text-sm">
                    <span className="truncate font-medium">{userName}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => openUserProfile()}>
                  <UserCircle aria-hidden="true" strokeWidth={1.5} />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={routes.terms}>
                    <Shield aria-hidden="true" strokeWidth={1.5} />
                    Terms and Conditions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={routes.privacy}>
                    <Shield aria-hidden="true" strokeWidth={1.5} />
                    Privacy Policy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={routes.cookies}>
                    <Cookie aria-hidden="true" strokeWidth={1.5} />
                    Cookie Policy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openPreferences}>
                  <Cookie aria-hidden="true" strokeWidth={1.5} />
                  Cookie preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void signOut({ redirectUrl: routes.home })}
                  variant="destructive"
                >
                  <LogOut aria-hidden="true" strokeWidth={1.5} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function initialsFor(value: string | null | undefined) {
  if (!value) {
    return 'AC';
  }

  const [first = '', second = ''] = value.trim().split(/\s+/);
  const initials = `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();

  return initials || 'AC';
}

function isNavigationItemActive(pathname: string, href: string) {
  if (href === routes.contacts) {
    return pathname === routes.contacts || pathname.startsWith(`${routes.contacts}/`);
  }

  return pathname === href;
}

function isNavigationSubItemActive(pathname: string, href: string) {
  if (href === routes.contacts) {
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) &&
        pathname !== routes.contactsImport)
    );
  }

  return pathname === href;
}
