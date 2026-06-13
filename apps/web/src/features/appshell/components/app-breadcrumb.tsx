"use client";

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';

const labels: Record<string, string> = {
  [routes.overview]: 'overview',
  [routes.contacts]: 'contacts',
  [routes.contactsImport]: 'importContacts',
  [routes.inbox]: 'inbox',
  [routes.campaigns]: 'campaigns',
  [routes.legal]: 'legal',
  [routes.settings]: 'organization',
  [routes.billing]: 'billing',
};

export function AppBreadcrumb() {
  const t = useTranslations('Chrome');
  const pathname = usePathname();
  const session = useOrganizationSession();
  const labelKey = breadcrumbLabelFor(pathname);
  const organizationName = session.data?.organization.name ?? t('workspace');

  return (
    <Breadcrumb aria-label={t('breadcrumb')} className="min-w-0">
      <BreadcrumbList className="min-w-0 flex-nowrap">
        <BreadcrumbItem>
          <BreadcrumbPage className="truncate">
            {organizationName}
          </BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate">{t(labelKey)}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function breadcrumbLabelFor(pathname: string) {
  if (pathname.startsWith(`${routes.legal}/`)) {
    return 'legal';
  }

  if (pathname.startsWith(`${routes.billing}/`)) {
    return 'billing';
  }

  if (pathname === routes.contactsImport) {
    return 'importContacts';
  }

  if (pathname.startsWith(`${routes.contacts}/`)) {
    return 'contact';
  }

  if (pathname.startsWith(`${routes.campaigns}/`)) {
    return 'campaigns';
  }

  return labels[pathname] ?? 'app';
}
