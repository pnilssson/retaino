"use client";

import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import type { Campaign, OrganizationSession } from '@retaino/shared/contracts';
import { AlertCircle, FileText, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, TableLoading } from '@/components/data-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
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

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <p className={textStyles.mutedBody}>Loading campaigns…</p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <Alert className="max-w-lg" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Campaigns could not be loaded</AlertTitle>
          <AlertDescription>{session.error.message}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  if (!campaignsAllowed(session.data)) {
    return <BlockedCampaigns session={session.data} />;
  }

  const canManageCampaigns = canManageOrganizationSetup(
    session.data.organization.role,
  );

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-7xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <>
              {canManageCampaigns ? (
                <Button asChild>
                  <Link href={routes.campaignNew}>
                    <Plus aria-hidden="true" data-icon="inline-start" />
                    New campaign
                  </Link>
                </Button>
              ) : null}
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
          }
          description="Review campaigns and previous sends for this organization."
          eyebrow="Campaigns"
          title="Campaigns"
        />

        <AppPageContent>
          <AppPageItem asChild>
            <section>
              <ItemHeader className="items-start">
                <ItemContent className="gap-2">
                  <ItemTitle>Campaigns</ItemTitle>
                  <ItemDescription>
                    Filter campaigns by status, audience, and activity.
                  </ItemDescription>
                </ItemContent>
              </ItemHeader>

              <CampaignFilters
                direction={direction}
                onChange={(values) => {
                  void setQuery(values);
                }}
                search={search}
                sort={sort}
                status={status}
              />

              {campaigns.isError ? (
                <ItemNotice
                  description={
                    campaigns.error instanceof Error
                      ? campaigns.error.message
                      : 'Try refreshing the list.'
                  }
                  title="Campaigns could not be fetched"
                  tone="destructive"
                />
              ) : campaigns.isLoading ? (
                <TableLoading label="Loading campaigns" />
              ) : filteredCampaigns.length > 0 ? (
                <CampaignsTable campaigns={filteredCampaigns} />
              ) : search || status !== 'all' ? (
                <EmptyState
                  description="Clear or change the filters to see more campaigns."
                  title="No campaigns match these filters"
                />
              ) : (
                <EmptyState
                  description={
                    canManageCampaigns
                      ? 'Create a campaign to choose a lapsed audience and write the SMS copy.'
                      : 'Campaigns will appear here after an organization admin creates one.'
                  }
                  title="No campaigns yet"
                />
              )}
            </section>
          </AppPageItem>
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
              <ItemNotice description={block.description} title={block.title} />
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

  return (
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}
