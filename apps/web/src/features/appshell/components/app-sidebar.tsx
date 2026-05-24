"use client";

import { useClerk, useUser } from '@clerk/nextjs';
import {
  Building2,
  ChevronsUpDown,
  Cookie,
  CreditCard,
  Inbox,
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import { useCookieConsent } from '@/features/cookies/hooks/use-cookie-consent';
import { initialsFor } from '@/features/appshell/initials';
import { useInboxSummary } from '@/features/inbox/hooks/use-inbox-summary';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { OrganizationSwitcher } from './organization-switcher';
import { SidebarAvatar } from './sidebar-avatar';

const navigationItems = [
  {
    title: 'Overview',
    href: routes.overview,
    icon: LayoutDashboard
  },
  {
    title: 'Contacts',
    href: routes.contacts,
    icon: UsersRound
  },
  {
    title: 'Campaigns',
    href: routes.campaigns,
    icon: Megaphone
  },
  {
    title: 'Inbox',
    href: routes.inbox,
    icon: Inbox,
    badge: 'inbox'
  },
];

const managementItems = [
  {
    title: 'Settings',
    href: routes.settings,
    icon: Building2
  },
  {
    title: 'Billing',
    href: routes.billing,
    icon: CreditCard
  }
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { openUserProfile, signOut } = useClerk();
  const { user } = useUser();
  const { openPreferences } = useCookieConsent();
  const session = useOrganizationSession();
  const organizationId = session.data?.organization.id ?? null;
  const inboxSummary = useInboxSummary({
    enabled: Boolean(session.data?.readiness.ready),
    organizationId,
  });
  const unreadInboxCount =
    inboxSummary.data?.unreadConversationCount ?? 0;
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const userName = user?.fullName ?? userEmail ?? 'Account';
  const userInitials = initialsFor(user?.fullName ?? userEmail, 'AC');

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
                  {item.badge === 'inbox' && unreadInboxCount > 0 ? (
                    <SidebarMenuBadge>
                      {unreadInboxCount > 99 ? '99+' : unreadInboxCount}
                    </SidebarMenuBadge>
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
                  <SidebarAvatar
                    alt={userName}
                    className="size-8 bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground"
                    fallback={userInitials}
                    hasImage={user?.hasImage}
                    imageUrl={user?.imageUrl}
                  />
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

function isNavigationItemActive(pathname: string, href: string) {
  if (href === routes.contacts) {
    return pathname === routes.contacts || pathname.startsWith(`${routes.contacts}/`);
  }

  return pathname === href;
}
