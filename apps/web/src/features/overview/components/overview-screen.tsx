"use client";

import {
  FileUp,
  Megaphone,
  Plus,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/data-table';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { AppPageLoading } from '@/features/appshell/components/app-page-loading';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { ContentSection } from '@/features/appshell/components/content-section';
import { useCampaigns } from '@/features/campaigns/hooks/use-campaigns';
import { useContactPresence } from '@/features/contacts/hooks/use-contact-presence';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { useOverviewDashboard } from '../hooks/use-overview-dashboard';
import { OverviewDashboard } from './overview-dashboard';

export function OverviewScreen() {
  const t = useTranslations('Overview');
  const contacts = useTranslations('Contacts');
  const common = useTranslations('Common');
  const chrome = useTranslations('Chrome');
  const session = useOrganizationSession();
  const organizationId = session.data?.organization.id ?? null;
  const dataEnabled = Boolean(session.data?.readiness.ready);
  const contactPresence = useContactPresence({
    enabled: dataEnabled,
    organizationId,
  });
  const campaigns = useCampaigns({
    enabled: dataEnabled,
    organizationId,
  });
  const overview = useOverviewDashboard({
    enabled: dataEnabled && Boolean(campaigns.data?.campaigns.length),
    organizationId,
  });

  if (session.isLoading) {
    return <AppPageLoading />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10" id="main-content">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title={t('loadErrorTitle')}
            variant="error"
          />
        </div>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  const hasContacts = (contactPresence.data?.total ?? 0) > 0;
  const hasCampaigns = (campaigns.data?.campaigns.length ?? 0) > 0;

  return (
    <main className="flex flex-1 bg-background" id="main-content">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <AppPageHeader
          description={t('description')}
          eyebrow={chrome('workspace')}
          title={t('title')}
        />

        {contactPresence.isError ? (
          <OverviewNotice
            description={
              contactPresence.error instanceof Error
                ? contactPresence.error.message
                : common('tryAgainSoon')
            }
            title={contacts('contactStatusCheckErrorTitle')}
          />
        ) : contactPresence.isLoading ? (
          <OverviewLoading label={t('checkingContacts')} />
        ) : !hasContacts ? (
          <OverviewEmptyState
            action={
              <Button asChild>
                <Link href={routes.contactsImport}>
                  <FileUp aria-hidden="true" data-icon="inline-start" />
                  {contacts('importCsv')}
                </Link>
              </Button>
            }
            description={contacts('importFirstContactsDescription')}
            icon={UsersRound}
            title={contacts('importFirstContactsTitle')}
          />
        ) : campaigns.isError ? (
          <OverviewNotice
            description={
              campaigns.error instanceof Error
                ? campaigns.error.message
                : common('tryAgainSoon')
            }
            title={t('campaignStatusCheckErrorTitle')}
          />
        ) : campaigns.isLoading ? (
          <OverviewLoading label={t('checkingCampaigns')} />
        ) : !hasCampaigns ? (
          <OverviewEmptyState
            action={
              <Button asChild>
                <Link href={routes.campaignNew}>
                  <Plus aria-hidden="true" data-icon="inline-start" />
                  {t('newCampaign')}
                </Link>
              </Button>
            }
            description={t('createFirstCampaignDescription')}
            icon={Megaphone}
            title={t('createFirstCampaignTitle')}
          />
        ) : overview.isError ? (
          <OverviewNotice
            description={
              overview.error instanceof Error
                ? overview.error.message
                : common('tryAgainSoon')
            }
            title={t('dashboardLoadErrorTitle')}
          />
        ) : overview.isLoading || !overview.data ? (
          <OverviewLoading label={t('loadingOverview')} />
        ) : (
          <OverviewDashboard overview={overview.data} />
        )}
      </section>
    </main>
  );
}

function OverviewEmptyState({
  action,
  description,
  icon,
  title,
}: {
  action: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="grid gap-5">
      <EmptyState
        action={action}
        description={description}
        framed
        icon={icon}
        title={title}
        variant="page"
      />
    </div>
  );
}

function OverviewLoading({ label }: { label: string }) {
  return (
    <div className="grid gap-5">
      <LoadingState className="py-6" label={label} />
    </div>
  );
}

function OverviewNotice({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="grid gap-5">
      <ContentSection asChild>
        <section>
          <ItemNotice
            description={description}
            title={title}
            variant="error"
          />
        </section>
      </ContentSection>
    </div>
  );
}
