"use client";

import type { Campaign, OrganizationSession } from '@retaino/shared/contracts';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  AppPageContent,
  AppPageItem,
  AppPageLoading,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import {
  campaignReadinessBlock,
  campaignsAllowed,
} from '../campaign-readiness';
import { CampaignForm, type CampaignStepId } from './campaign-form';
import { CampaignOverview } from './campaign-overview';
import { CampaignStatusBadge } from './campaign-status-badge';
import { useCampaign } from '../hooks/use-campaign';

const CREATED_CAMPAIGN_INITIAL_STEP_STORAGE_KEY =
  'retaino.createdCampaignInitialStep';

export function CampaignBuilderScreen({
  campaignId,
}: {
  campaignId?: string;
}) {
  const router = useRouter();
  const [createdCampaignInitialStep] = useState<CampaignStepId | undefined>(
    () => {
      if (!campaignId || typeof window === 'undefined') {
        return undefined;
      }

      const storedValue = window.sessionStorage.getItem(
        CREATED_CAMPAIGN_INITIAL_STEP_STORAGE_KEY,
      );
      const [createdCampaignId, initialStep] = storedValue?.split(':') ?? [];

      if (createdCampaignId !== campaignId) {
        return undefined;
      }

      window.sessionStorage.removeItem(CREATED_CAMPAIGN_INITIAL_STEP_STORAGE_KEY);

      return isCampaignStepId(initialStep) ? initialStep : undefined;
    },
  );
  const [overviewAfterSendCampaignId, setOverviewAfterSendCampaignId] =
    useState<string | null>(null);
  const session = useOrganizationSession();
  const organizationId = session.data?.organization.id ?? null;
  const campaign = useCampaign({
    campaignId: campaignId ?? null,
    enabled: Boolean(session.data?.readiness.ready && campaignId),
    organizationId,
  });
  const latestCampaign = campaign.data?.campaign ?? null;
  const showOverview =
    latestCampaign &&
    (hasOverviewStatus(latestCampaign.status) ||
      overviewAfterSendCampaignId === latestCampaign.id);
  const sendAccepted =
    Boolean(latestCampaign) &&
    overviewAfterSendCampaignId === latestCampaign?.id &&
    latestCampaign?.status === 'ready_to_send';
  const shouldPollCampaign =
    Boolean(showOverview) &&
    latestCampaign?.status !== 'sent' &&
    latestCampaign?.status !== 'failed';
  const refetchCampaign = campaign.refetch;
  const title = campaignId
    ? campaignOverviewTitle(latestCampaign)
    : 'New campaign';

  useEffect(() => {
    if (!shouldPollCampaign) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void refetchCampaign();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [refetchCampaign, shouldPollCampaign]);

  if (session.isLoading) {
    return <AppPageLoading className="max-w-5xl" />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title="Campaign builder could not be loaded"
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
    return <BlockedCampaignBuilder session={session.data} />;
  }

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <Button asChild variant="outline">
              <Link href={routes.campaigns}>
                <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                Back to campaigns
              </Link>
            </Button>
          }
          badge={
            showOverview && latestCampaign ? (
              sendAccepted ? (
                <StatusBadge label="Send queued" tone="amber" />
              ) : (
                <CampaignStatusBadge status={latestCampaign.status} />
              )
            ) : undefined
          }
          eyebrow={showOverview ? 'Campaign overview' : 'Campaign builder'}
          title={title}
        />

        {campaignId && campaign.isError ? (
          <ItemNotice
            description={
              campaign.error instanceof Error
                ? campaign.error.message
                : 'Try returning to the campaign list.'
            }
            title="Campaign could not be fetched"
            variant="error"
          />
        ) : campaignId && campaign.isLoading ? (
          <LoadingState className="py-6" label="Loading campaign" />
        ) : showOverview && latestCampaign ? (
          <CampaignOverview
            campaign={latestCampaign}
            organizationId={organizationId}
            sendAccepted={sendAccepted}
          />
        ) : (
          <>
            <CampaignForm
              campaign={latestCampaign}
              initialStep={createdCampaignInitialStep}
              key={latestCampaign?.id ?? 'new'}
              onCreated={(createdCampaignId, initialStep) => {
                window.sessionStorage.setItem(
                  CREATED_CAMPAIGN_INITIAL_STEP_STORAGE_KEY,
                  `${createdCampaignId}:${initialStep}`,
                );
                router.replace(routes.campaign(createdCampaignId));
              }}
              onSent={(response) => {
                setOverviewAfterSendCampaignId(response.campaign.id);
              }}
              organizationId={organizationId}
            />
          </>
        )}
      </section>
    </main>
  );
}

function isCampaignStepId(value: string | undefined): value is CampaignStepId {
  return (
    value === 'audience' ||
    value === 'message' ||
    value === 'booking' ||
    value === 'sender' ||
    value === 'test' ||
    value === 'review'
  );
}

function BlockedCampaignBuilder({ session }: { session: OrganizationSession }) {
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
          eyebrow="Campaign builder"
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

function hasOverviewStatus(status: string) {
  return status === 'sending' || status === 'sent' || status === 'failed';
}

function campaignOverviewTitle(campaign: Campaign | null) {
  if (!campaign) {
    return 'Campaign';
  }

  const reference = campaign.campaignCode?.trim();

  if (!reference || reference.toLowerCase() === campaign.name.trim().toLowerCase()) {
    return campaign.name;
  }

  return `${campaign.name} (${reference})`;
}
