"use client";

import { useClerk } from '@clerk/nextjs';
import {
  Cookie,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  SidebarRail
} from '@/components/ui/sidebar';
import { useCookieConsent } from '@/features/cookies/cookie-consent-provider';
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
    icon: UsersRound
  },
  {
    title: 'Campaigns',
    href: routes.campaigns,
    icon: Megaphone
  },
  {
    title: 'Settings',
    href: routes.settings,
    icon: Settings
  }
];

export function AppSidebar() {
  const pathname = usePathname();
  const { openUserProfile, signOut } = useClerk();
  const { openPreferences } = useCookieConsent();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Retaino">
              <Link href={routes.overview}>
                <span className="text-base tracking-tight">retaino.</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                <SidebarMenuButton tooltip="Account">
                  <UserCircle aria-hidden="true" strokeWidth={1.5} />
                  <span>Account</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-(--radix-dropdown-menu-trigger-width)"
                side="top"
                sideOffset={4}
              >
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => openUserProfile()}>
                  <UserCircle aria-hidden="true" strokeWidth={1.5} />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Shield aria-hidden="true" strokeWidth={1.5} />
                    Legal and privacy
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem asChild>
                      <Link href={routes.terms}>
                        <Shield aria-hidden="true" strokeWidth={1.5} />
                        Terms
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
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
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
