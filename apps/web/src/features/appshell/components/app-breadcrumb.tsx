"use client";

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';

const labels: Record<string, string> = {
  [routes.overview]: 'Overview',
  [routes.contacts]: 'Contacts',
  [routes.campaigns]: 'Campaigns',
  [routes.settings]: 'Settings'
};

export function AppBreadcrumb() {
  const pathname = usePathname();
  const session = useOrganizationSession();
  const label = labels[pathname] ?? 'App';
  const organizationName = session.data?.organization.name ?? 'Workspace';

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="min-w-0 flex-nowrap">
        <BreadcrumbItem>
          <BreadcrumbPage className="truncate">
            {organizationName}
          </BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate">{label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
