"use client";

import {
  useClerk,
  useUser,
} from '@clerk/nextjs';
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
  UsersRound,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { localizedPathname } from '@/i18n/paths';
import { Link } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import { LocaleMenuItem } from '@/components/locale-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
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
  useSidebar,
} from '@/components/ui/sidebar';
import { useCookieConsent } from '@/features/cookies/hooks/use-cookie-consent';
import { initialsFor } from '@/features/appshell/initials';
import { useInboxSummary } from '@/features/inbox/hooks/use-inbox-summary';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { OrganizationSwitcher } from './organization-switcher';
import { SidebarAvatar } from './sidebar-avatar';

const navigationItems = [
  {
    titleKey: 'overview',
    href: routes.overview,
    icon: LayoutDashboard
  },
  {
    titleKey: 'contacts',
    href: routes.contacts,
    icon: UsersRound
  },
  {
    titleKey: 'campaigns',
    href: routes.campaigns,
    icon: Megaphone
  },
  {
    titleKey: 'inbox',
    href: routes.inbox,
    icon: Inbox,
    badge: 'inbox'
  },
];

const managementItems = [
  {
    titleKey: 'organization',
    href: routes.settings,
    icon: Building2
  },
  {
    titleKey: 'billing',
    href: routes.billing,
    icon: CreditCard
  }
];

export function AppSidebar() {
  const t = useTranslations('Chrome');
  const locale = useLocale();
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
  const userName = user?.fullName ?? userEmail ?? t('account');
  const userInitials = initialsFor(user?.fullName ?? userEmail, 'AC');

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('operate')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavigationItemActive(pathname, item.href)}
                    tooltip={t(item.titleKey)}
                  >
                    <Link href={item.href}>
                      <item.icon aria-hidden="true" strokeWidth={1.5} />
                      <span>{t(item.titleKey)}</span>
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
          <SidebarGroupLabel>{t('manage')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={t(item.titleKey)}
                  >
                    <Link href={item.href}>
                      <item.icon aria-hidden="true" strokeWidth={1.5} />
                      <span>{t(item.titleKey)}</span>
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
                    className={cn(
                      'size-8 bg-sidebar-primary',
                      textStyles.small,
                      'text-sidebar-primary-foreground',
                    )}
                    collapsedFallback={
                      <UserCircle
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={1.5}
                      />
                    }
                    fallback={userInitials}
                    hasImage={user?.hasImage}
                    imageUrl={user?.imageUrl}
                  />
                  <span className="grid flex-1 text-left">
                    <span className={cn('truncate', textStyles.h3)}>
                      {userName}
                    </span>
                  </span>
                  <ChevronsUpDown
                    aria-hidden="true"
                    className="ml-auto size-4 group-data-[collapsible=icon]:hidden"
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
                <DropdownMenuLabel className="p-0">
                  <div className="grid gap-1 px-1 py-1.5 text-left">
                    <span className={cn('truncate', textStyles.h3)}>
                      {userName}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => openUserProfile()}>
                  <UserCircle aria-hidden="true" strokeWidth={1.5} />
                  {t('profile')}
                </DropdownMenuItem>
                <LocaleMenuItem />
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Shield aria-hidden="true" strokeWidth={1.5} />
                    {t('legalAndPrivacy')}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem asChild>
                      <Link href={routes.terms}>
                        <Shield aria-hidden="true" strokeWidth={1.5} />
                        {t('terms')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={routes.privacy}>
                        <Shield aria-hidden="true" strokeWidth={1.5} />
                        {t('privacyPolicy')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={routes.cookies}>
                        <Cookie aria-hidden="true" strokeWidth={1.5} />
                        {t('cookiePolicy')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={openPreferences}>
                      <Cookie aria-hidden="true" strokeWidth={1.5} />
                      {t('cookiePreferences')}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void signOut({ redirectUrl: localizedPathname(routes.home, locale) })}
                  variant="destructive"
                >
                  <LogOut aria-hidden="true" strokeWidth={1.5} />
                  {t('signOut')}
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
