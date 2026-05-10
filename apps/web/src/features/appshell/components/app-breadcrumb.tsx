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
  [routes.contactsImport]: 'Import contacts',
  [routes.contactImports]: 'Imports',
  [routes.campaigns]: 'Campaigns',
  [routes.settings]: 'Organization settings'
};

export function AppBreadcrumb() {
  const pathname = usePathname();
  const session = useOrganizationSession();
  const label = breadcrumbLabelFor(pathname);
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

function breadcrumbLabelFor(pathname: string) {
  if (pathname.startsWith('/app/legal/')) {
    return 'Legal';
  }

  if (pathname === routes.contactImports) {
    return 'Imports';
  }

  if (pathname === routes.contactsImport) {
    return 'Import contacts';
  }

  if (pathname.startsWith(`${routes.contactImports}/`)) {
    return 'Import contacts';
  }

  if (pathname.startsWith(`${routes.contacts}/`)) {
    return 'Contact';
  }

  return labels[pathname] ?? 'App';
}
