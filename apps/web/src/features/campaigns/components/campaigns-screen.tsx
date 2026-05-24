"use client";

import type { Campaign, OrganizationSession } from '@retaino/shared/contracts';
import {
  FileText,
  FileUp,
  Megaphone,
  Plus,
  RefreshCw,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import {
  AppPageContent,
  AppPageItem,
  AppPageLoading,
  AppPageSection,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useContactPresence } from '@/features/contacts/hooks/use-contact-presence';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import {
  campaignReadinessBlock,
  campaignsAllowed,
} from '../campaign-readiness';
import type {
  CampaignListDirection,
  CampaignListSort,
  CampaignListStatusFilter,
} from '../campaign-list-state';
import { CampaignFilters } from './campaign-filters';
import { CampaignsTable } from './campaigns-table';
import { useCampaignListQueryState } from '../hooks/use-campaign-list-query-state';
import { useCampaigns } from '../hooks/use-campaigns';

export function CampaignsScreen() {
  const session = useOrganizationSession();
  const [{ direction, search, sort, status }, setQuery] =
    useCampaignListQueryState();
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
  const handleSort = (nextSort: CampaignListSort) => {
    const nextDirection =
      nextSort === sort
        ? direction === 'asc'
          ? 'desc'
          : 'asc'
        : defaultCampaignSortDirection(nextSort);

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
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title="Campaigns could not be loaded"
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
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-7xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            hasContacts && hasCampaigns ? (
              <>
              <Button asChild>
                <Link href={routes.campaignNew}>
                  <Plus aria-hidden="true" data-icon="inline-start" />
                  New campaign
                </Link>
              </Button>
              <Button
                onClick={() => {
                  void campaigns.refetch();
                }}
                type="button"
                variant="outline"
              >
                <RefreshCw aria-hidden="true" data-icon="inline-start" />
                Refresh
              </Button>
              </>
            ) : null
          }
          description="Review campaigns and previous sends for this organization."
          title="Campaigns"
        />

        <AppPageContent>
          {contactPresence.isError ? (
            <AppPageItem asChild>
              <section>
                <ItemNotice
                  description={
                    contactPresence.error instanceof Error
                      ? contactPresence.error.message
                      : 'Try refreshing the page.'
                  }
                  title="Contact status could not be checked"
                  variant="error"
                />
              </section>
            </AppPageItem>
          ) : !contactPresenceLoaded ? (
            <AppPageSection
              description="Filter campaigns by status, audience, and activity."
              framed={false}
              title="Campaign list"
            >
              <CampaignsTable
                campaigns={[]}
                direction={direction}
                isLoading
                loadingLabel="Checking contacts"
                onSort={handleSort}
                sort={sort}
              />
            </AppPageSection>
          ) : !hasContacts ? (
            <AppPageItem asChild>
              <section>
                <EmptyState
                  action={
                    <Button asChild>
                      <Link href={routes.contactsImport}>
                        <FileUp aria-hidden="true" data-icon="inline-start" />
                        Import CSV
                      </Link>
                    </Button>
                  }
                  description="Import contacts first so every campaign can preview a real audience before you write and send SMS."
                  icon={UsersRound}
                  title="Import contacts before campaigns"
                  variant="page"
                />
              </section>
            </AppPageItem>
          ) : campaigns.isError ? (
            <AppPageItem asChild>
              <section>
                <ItemNotice
                  description={
                    campaigns.error instanceof Error
                      ? campaigns.error.message
                      : 'Try refreshing the list.'
                  }
                  title="Campaigns could not be fetched"
                  variant="error"
                />
              </section>
            </AppPageItem>
          ) : campaigns.isLoading ? (
            <AppPageSection
              description="Filter campaigns by status, audience, and activity."
              framed={false}
              title="Campaign list"
            >
              <CampaignFilters
                onChange={(values) => {
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
            </AppPageSection>
          ) : !hasCampaigns ? (
            <AppPageItem asChild>
              <section>
                <EmptyState
                  action={
                    <Button asChild>
                      <Link href={routes.campaignNew}>
                        <Plus aria-hidden="true" data-icon="inline-start" />
                        New campaign
                      </Link>
                    </Button>
                  }
                  description="Create a campaign to choose a lapsed audience, write the SMS copy, and prepare your first send."
                  icon={Megaphone}
                  title="Create your first campaign"
                  variant="page"
                />
              </section>
            </AppPageItem>
          ) : (
            <AppPageSection
              description="Filter campaigns by status, audience, and activity."
              framed={false}
              title="Campaign list"
            >
                <>
                  <CampaignFilters
                    onChange={(values) => {
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
                      onSort={handleSort}
                      sort={sort}
                    />
                  ) : (
                    <EmptyState
                      description="Clear or change the filters to see more campaigns."
                      title="No campaigns match these filters"
                    />
                  )}
                </>
            </AppPageSection>
          )}
        </AppPageContent>
      </section>
    </main>
  );
}

function BlockedCampaigns({ session }: { session: OrganizationSession }) {
  const block = campaignReadinessBlock(session);

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <AppPageHeader
          badge={
            <StatusBadge
              label={block.badgeLabel}
              tone="amber"
            />
          }
          description={block.description}
          eyebrow="Campaigns"
          title={block.title}
        />
        <AppPageContent>
          <AppPageItem asChild>
            <section>
              <ItemNotice
                description={block.description}
                title={block.title}
                variant="warning"
              />
              <div className="flex justify-end">
                <Button asChild>
                  <Link href={block.actionHref}>
                    <FileText aria-hidden="true" data-icon="inline-start" />
                    {block.actionLabel}
                  </Link>
                </Button>
              </div>
            </section>
          </AppPageItem>
        </AppPageContent>
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
