"use client";

import {
  FileUp,
  Megaphone,
  Plus,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/data-table';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import {
  AppPageContent,
  AppPageItem,
  AppPageLoading,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useCampaigns } from '@/features/campaigns/hooks/use-campaigns';
import { useContactPresence } from '@/features/contacts/hooks/use-contact-presence';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';

export function OverviewScreen() {
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

  if (session.isLoading) {
    return <AppPageLoading />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title="Overview could not be loaded"
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
    <main className="flex flex-1 bg-background">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <AppPageHeader
          description="Bookings, attributed revenue, and confidence reporting will live here."
          eyebrow="Workspace"
          title="Overview"
        />

        {contactPresence.isError ? (
          <OverviewNotice
            description={
              contactPresence.error instanceof Error
                ? contactPresence.error.message
                : 'Try refreshing the page.'
            }
            title="Contact status could not be checked"
          />
        ) : contactPresence.isLoading ? (
          <OverviewLoading label="Checking contacts" />
        ) : !hasContacts ? (
          <OverviewEmptyState
            action={
              <Button asChild>
                <Link href={routes.contactsImport}>
                  <FileUp aria-hidden="true" data-icon="inline-start" />
                  Import CSV
                </Link>
              </Button>
            }
            description="Import a customer CSV to validate phone numbers, consent, dedupe results, and suppression checks before your first campaign."
            icon={UsersRound}
            title="Import your first contacts"
          />
        ) : campaigns.isError ? (
          <OverviewNotice
            description={
              campaigns.error instanceof Error
                ? campaigns.error.message
                : 'Try refreshing the page.'
            }
            title="Campaign status could not be checked"
          />
        ) : campaigns.isLoading ? (
          <OverviewLoading label="Checking campaigns" />
        ) : !hasCampaigns ? (
          <OverviewEmptyState
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
          />
        ) : null}
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
    <AppPageContent>
      <AppPageItem asChild>
        <section>
          <EmptyState
            action={action}
            description={description}
            icon={icon}
            title={title}
            variant="page"
          />
        </section>
      </AppPageItem>
    </AppPageContent>
  );
}

function OverviewLoading({ label }: { label: string }) {
  return (
    <AppPageContent>
      <LoadingState className="py-6" label={label} />
    </AppPageContent>
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
    <AppPageContent>
      <AppPageItem asChild>
        <section>
          <ItemNotice
            description={description}
            title={title}
            variant="error"
          />
        </section>
      </AppPageItem>
    </AppPageContent>
  );
}
