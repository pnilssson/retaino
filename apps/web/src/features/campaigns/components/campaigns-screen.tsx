"use client";

import type {
  Campaign,
  OrganizationSession,
} from '@retaino/shared/contracts';
import {
  FileText,
  FileUp,
  Megaphone,
  Plus,
  UsersRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  useMemo,
  useState,
} from 'react';
import type { RowSelectionState } from '@tanstack/react-table';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { AppPageLoading } from '@/features/appshell/components/app-page-loading';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { ContentSection } from '@/features/appshell/components/content-section';
import { useContactPresence } from '@/features/contacts/hooks/use-contact-presence';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import {
  campaignReadinessBlock,
  campaignReadinessBlockView,
  campaignsAllowed,
} from '../campaign-readiness';
import type {
  CampaignListDirection,
  CampaignListSort,
  CampaignListStatusFilter,
} from '../campaign-list-state';
import { CampaignBulkActions } from './campaign-bulk-actions';
import { CampaignFilters } from './campaign-filters';
import { CampaignsTable } from './campaigns-table';
import { useCampaignListQueryState } from '../hooks/use-campaign-list-query-state';
import { useCampaigns } from '../hooks/use-campaigns';

export function CampaignsScreen() {
  const t = useTranslations('Campaigns');
  const common = useTranslations('Common');
  const contacts = useTranslations('Contacts');
  const session = useOrganizationSession();
  const [{ direction, search, sort, status }, setQuery] =
    useCampaignListQueryState();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const organizationId = session.data?.organization.id ?? null;
  const campaigns = useCampaigns({
    enabled: Boolean(session.data?.readiness.ready),
    organizationId,
  });
  const contactPresence = useContactPresence({
    enabled: Boolean(session.data?.readiness.ready),
    organizationId,
  });
  const filteredCampaigns = useMemo(
    () =>
      filterAndSortCampaigns(campaigns.data?.campaigns ?? [], {
        direction,
        search,
        sort,
        status,
      }),
    [campaigns.data?.campaigns, direction, search, sort, status],
  );
  const selectedCampaigns = useMemo(
    () => filteredCampaigns.filter((campaign) => rowSelection[campaign.id]),
    [filteredCampaigns, rowSelection],
  );
  const handleSort = (nextSort: CampaignListSort) => {
    const nextDirection =
      nextSort === sort
        ? direction === 'asc'
          ? 'desc'
          : 'asc'
        : defaultCampaignSortDirection(nextSort);

    setRowSelection({});
    void setQuery({
      direction: nextDirection,
      sort: nextSort,
    });
  };

  if (session.isLoading) {
    return <AppPageLoading className="max-w-7xl" />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10" id="main-content">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title={t('campaignsLoadErrorTitle')}
            variant="error"
          />
        </div>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  if (!campaignsAllowed(session.data)) {
    return <BlockedCampaigns session={session.data} />;
  }

  const hasContacts = (contactPresence.data?.total ?? 0) > 0;
  const contactPresenceLoaded = Boolean(contactPresence.data);
  const hasCampaigns = (campaigns.data?.campaigns.length ?? 0) > 0;

  return (
    <main className="flex flex-1 items-start bg-background" id="main-content">
      <section className="mx-auto grid w-full max-w-7xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            hasContacts && hasCampaigns ? (
              <Button asChild>
                <Link href={routes.campaignNew}>
                  <Plus aria-hidden="true" data-icon="inline-start" />
                  {t('newCampaign')}
                </Link>
              </Button>
            ) : null
          }
          title={t('campaignsTitle')}
        />

        <div className="grid gap-5">
          {contactPresence.isError ? (
            <ContentSection asChild>
              <section>
                <ItemNotice
                  description={
                    contactPresence.error instanceof Error
                      ? contactPresence.error.message
                      : common('tryAgainSoon')
                  }
                  title={contacts('contactStatusCheckErrorTitle')}
                  variant="error"
                />
              </section>
            </ContentSection>
          ) : !contactPresenceLoaded ? (
            <ContentSection framed={false}>
              <CampaignsTable
                campaigns={[]}
                direction={direction}
                isLoading
                loadingLabel={t('checkingContacts')}
                onSort={handleSort}
                sort={sort}
              />
            </ContentSection>
          ) : !hasContacts ? (
            <EmptyState
              action={
                <Button asChild>
                  <Link href={routes.contactsImport}>
                    <FileUp aria-hidden="true" data-icon="inline-start" />
                    {contacts('importCsv')}
                  </Link>
                </Button>
              }
              description={t('importContactsBeforeCampaignsDescription')}
              framed
              icon={UsersRound}
              title={t('importContactsBeforeCampaignsTitle')}
              variant="page"
            />
          ) : campaigns.isError ? (
            <ContentSection asChild>
              <section>
                <ItemNotice
                  description={
                    campaigns.error instanceof Error
                      ? campaigns.error.message
                      : t('campaignsFetchFallbackError')
                  }
                  title={t('campaignsFetchErrorTitle')}
                  variant="error"
                />
              </section>
            </ContentSection>
          ) : campaigns.isLoading ? (
            <ContentSection framed={false}>
              <CampaignFilters
                onChange={(values) => {
                  setRowSelection({});
                  void setQuery(values);
                }}
                search={search}
                status={status}
              />
              <CampaignsTable
                campaigns={[]}
                direction={direction}
                isLoading
                onSort={handleSort}
                sort={sort}
              />
            </ContentSection>
          ) : !hasCampaigns ? (
            <EmptyState
              action={
                <Button asChild>
                  <Link href={routes.campaignNew}>
                    <Plus aria-hidden="true" data-icon="inline-start" />
                    {t('newCampaign')}
                  </Link>
                </Button>
              }
              description={t('createFirstCampaignDescription')}
              framed
              icon={Megaphone}
              title={t('createFirstCampaignTitle')}
              variant="page"
            />
          ) : (
            <ContentSection framed={false}>
                <>
                  <CampaignFilters
                    onChange={(values) => {
                      setRowSelection({});
                      void setQuery(values);
                    }}
                    search={search}
                    status={status}
                  />

                  {filteredCampaigns.length > 0 ? (
                    <CampaignsTable
                      campaigns={filteredCampaigns}
                      direction={direction}
                      isLoading={campaigns.isFetching}
                      onRowSelectionChange={setRowSelection}
                      onSort={handleSort}
                      organizationId={organizationId}
                      rowSelection={rowSelection}
                      selectable
                      sort={sort}
                      tableActions={
                        <CampaignBulkActions
                          campaigns={selectedCampaigns}
                          onClear={() => setRowSelection({})}
                          organizationId={organizationId}
                        />
                      }
                    />
                  ) : (
                    <EmptyState
                      description={t('emptyFilteredCampaignsDescription')}
                      title={t('emptyFilteredCampaignsTitle')}
                    />
                  )}
                </>
            </ContentSection>
          )}
        </div>
      </section>
    </main>
  );
}

function BlockedCampaigns({ session }: { session: OrganizationSession }) {
  const t = useTranslations('Campaigns');
  const block = campaignReadinessBlock(session);
  const view = campaignReadinessBlockView(session, t);

  return (
    <main className="flex flex-1 items-start bg-background" id="main-content">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <AppPageHeader
          badge={
            <StatusBadge
              label={view.badgeLabel}
              tone="amber"
            />
          }
          description={view.description}
          eyebrow={t('campaignsTitle')}
          title={view.title}
        />
        <div className="grid gap-5">
          <ContentSection asChild>
            <section>
              <ItemNotice
                description={view.description}
                title={view.title}
                variant="warning"
              />
              <div className="flex justify-end">
                <Button asChild>
                  <Link href={block.actionHref}>
                    <FileText aria-hidden="true" data-icon="inline-start" />
                    {view.actionLabel}
                  </Link>
                </Button>
              </div>
            </section>
          </ContentSection>
        </div>
      </section>
    </main>
  );
}

function filterAndSortCampaigns(
  campaigns: Campaign[],
  input: {
    direction: CampaignListDirection;
    search: string;
    sort: CampaignListSort;
    status: CampaignListStatusFilter;
  },
) {
  const search = input.search.trim().toLowerCase();

  return campaigns
    .filter((campaign) => {
      if (input.status !== 'all' && campaign.status !== input.status) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [campaign.name, campaign.campaignCode ?? ''].some((value) =>
        value.toLowerCase().includes(search),
      );
    })
    .sort((left, right) => {
      const comparison = compareCampaigns(left, right, input.sort);
      return input.direction === 'asc' ? comparison : -comparison;
    });
}

function compareCampaigns(
  left: Campaign,
  right: Campaign,
  sort: CampaignListSort,
) {
  if (sort === 'name') {
    return left.name.localeCompare(right.name);
  }

  if (sort === 'status') {
    return left.status.localeCompare(right.status);
  }

  if (sort === 'lapsedDays') {
    return left.audienceRule.lapsedDays - right.audienceRule.lapsedDays;
  }

  if (sort === 'updatedAt') {
    return (
      new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
    );
  }

  return (
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

function defaultCampaignSortDirection(sort: CampaignListSort) {
  return sort === 'name' || sort === 'status' ? 'asc' : 'desc';
}
