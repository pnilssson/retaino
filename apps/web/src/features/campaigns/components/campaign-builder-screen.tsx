"use client";

import type {
  Campaign,
  OrganizationSession,
} from '@retaino/shared/contracts';
import {
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import {
  useEffect,
  useState,
} from 'react';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { AppPageLoading } from '@/features/appshell/components/app-page-loading';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { ContentSection } from '@/features/appshell/components/content-section';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import {
  campaignReadinessBlock,
  campaignReadinessBlockView,
  campaignsAllowed,
} from '../campaign-readiness';
import { CampaignDraftActions } from './campaign-draft-actions';
import {
  CampaignForm,
  type CampaignStepId,
} from './campaign-form';
import { CampaignOverview } from './campaign-overview';
import { useCampaign } from '../hooks/use-campaign';

const CREATED_CAMPAIGN_INITIAL_STEP_STORAGE_KEY =
  'retaino.createdCampaignInitialStep';

export function CampaignBuilderScreen({
  campaignId,
}: {
  campaignId?: string;
}) {
  const t = useTranslations('Campaigns');
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

      return normalizedCampaignStepId(initialStep);
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
    ? campaignOverviewTitle(latestCampaign, t)
    : t('newCampaignTitle');

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
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10" id="main-content">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title={t('campaignBuilderLoadErrorTitle')}
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
    <main className="flex flex-1 items-start bg-background" id="main-content">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <>
              <Button asChild className="px-0" variant="link">
                <Link aria-label={t('backToCampaigns')} href={routes.campaigns}>
                  <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                  <span className="sm:hidden">{t('back')}</span>
                  <span className="hidden sm:inline">{t('backToCampaigns')}</span>
                </Link>
              </Button>
              {latestCampaign?.status === 'draft' ? (
                <CampaignDraftActions
                  campaign={latestCampaign}
                  organizationId={organizationId}
                />
              ) : null}
            </>
          }
          eyebrow={showOverview ? t('campaignOverview') : t('campaignBuilder')}
          title={title}
        />

        {campaignId && campaign.isError ? (
          <ItemNotice
            description={
              campaign.error instanceof Error
                ? campaign.error.message
                : t('campaignFetchErrorDescription')
            }
            title={t('campaignFetchErrorTitle')}
            variant="error"
          />
        ) : campaignId && campaign.isLoading ? (
          <LoadingState className="py-6" label={t('loadingCampaign')} />
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
              defaultSenderCountryCode={session.data?.profile?.countryCode ?? 'SE'}
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

function normalizedCampaignStepId(
  value: string | undefined,
): CampaignStepId | undefined {
  if (
    value === 'audience' ||
    value === 'message' ||
    value === 'sender' ||
    value === 'review'
  ) {
    return value;
  }

  if (value === 'booking' || value === 'test') {
    return 'review';
  }

  return undefined;
}

function BlockedCampaignBuilder({ session }: { session: OrganizationSession }) {
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
          eyebrow={t('campaignBuilder')}
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

function hasOverviewStatus(status: string) {
  return status === 'sending' || status === 'sent' || status === 'failed';
}

function campaignOverviewTitle(
  campaign: Campaign | null,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
) {
  if (!campaign) {
    return t('campaignFallbackTitle');
  }

  const reference = campaign.campaignCode?.trim();

  if (!reference || reference.toLowerCase() === campaign.name.trim().toLowerCase()) {
    return campaign.name;
  }

  return `${campaign.name} (${reference})`;
}
