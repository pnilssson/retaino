"use client";

import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import type { OrganizationSession } from '@retaino/shared/contracts';
import { AlertCircle, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { CampaignForm, type CampaignStepId } from './campaign-form';
import { useCampaign } from '../hooks/use-campaign';

const CREATED_CAMPAIGN_REVIEW_STEP_STORAGE_KEY =
  'retaino.createdCampaignReviewStep';

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

      const createdCampaignId = window.sessionStorage.getItem(
        CREATED_CAMPAIGN_REVIEW_STEP_STORAGE_KEY,
      );

      if (createdCampaignId !== campaignId) {
        return undefined;
      }

      window.sessionStorage.removeItem(CREATED_CAMPAIGN_REVIEW_STEP_STORAGE_KEY);
      return 'review';
    },
  );
  const session = useOrganizationSession();
  const organizationId = session.data?.organization.id ?? null;
  const campaign = useCampaign({
    campaignId: campaignId ?? null,
    enabled: Boolean(session.data?.readiness.ready && campaignId),
    organizationId,
  });

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
          <p className={textStyles.mutedBody}>Loading campaign builder.</p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <Alert className="max-w-lg" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Campaign builder could not be loaded</AlertTitle>
          <AlertDescription>{session.error.message}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  if (!campaignsAllowed(session.data)) {
    return <BlockedCampaignBuilder session={session.data} />;
  }

  const canManageCampaigns = canManageOrganizationSetup(
    session.data.organization.role,
  );
  const latestCampaign = campaign.data?.campaign ?? null;
  const title = campaignId
    ? latestCampaign?.name ?? 'Campaign'
    : 'New campaign';

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
          eyebrow="Campaign builder"
          title={title}
        />

        {campaignId && campaign.isError ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Campaign could not be fetched</AlertTitle>
            <AlertDescription>
              {campaign.error instanceof Error
                ? campaign.error.message
                : 'Try returning to the campaign list.'}
            </AlertDescription>
          </Alert>
        ) : campaignId && campaign.isLoading ? (
          <p className={textStyles.mutedBody}>Loading campaign.</p>
        ) : (
          <CampaignForm
            canManageCampaigns={canManageCampaigns}
            campaign={latestCampaign}
            initialStep={createdCampaignInitialStep}
            key={latestCampaign?.id ?? 'new'}
            onCreated={(createdCampaignId) => {
              window.sessionStorage.setItem(
                CREATED_CAMPAIGN_REVIEW_STEP_STORAGE_KEY,
                createdCampaignId,
              );
              router.replace(routes.campaign(createdCampaignId));
            }}
            organizationId={organizationId}
          />
        )}
      </section>
    </main>
  );
}

function BlockedCampaignBuilder({ session }: { session: OrganizationSession }) {
  const legalUpdateRequired =
    session.readiness.legalUpdatesRequired || !session.readiness.legalCurrent;
  const title = legalUpdateRequired
    ? 'Legal updates required before campaign previews'
    : 'Finish setup before campaign work';
  const description = legalUpdateRequired
    ? 'Updated legal terms must be accepted before campaign audiences can be previewed.'
    : 'Company profile and legal agreement acceptance are required before campaigns can be prepared.';
  const actionHref = legalUpdateRequired ? routes.legal : routes.organizationSetup;
  const actionLabel = legalUpdateRequired ? 'Review legal updates' : 'Finish setup';

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <AppPageHeader
          badge={
            <StatusBadge
              label={legalUpdateRequired ? 'Legal updates required' : 'Setup required'}
              tone="amber"
            />
          }
          description={description}
          eyebrow="Campaign builder"
          title={title}
        />
        <AppPageContent>
          <AppPageItem asChild>
            <section>
              <ItemNotice description={description} title={title} />
              <div className="flex justify-end">
                <Button asChild>
                  <Link href={actionHref}>
                    <FileText aria-hidden="true" data-icon="inline-start" />
                    {actionLabel}
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

function campaignsAllowed(session: OrganizationSession) {
  return (
    session.readiness.ready &&
    session.readiness.legalCurrent &&
    !session.readiness.legalUpdatesRequired
  );
}
