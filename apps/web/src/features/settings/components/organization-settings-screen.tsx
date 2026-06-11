"use client";

import { useClerk } from '@clerk/nextjs';
import {
  canManageOrganizationSetup,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import {
  CheckCircle2,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { AppPageLoading } from '@/features/appshell/components/app-page-loading';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { ComplianceSection } from './compliance-section';
import { ProfileSection } from './profile-section';
import { TeamInvitationSection } from './team-invitation-section';

export function OrganizationSettingsScreen() {
  const session = useOrganizationSession();
  const { openOrganizationProfile } = useClerk();

  if (session.isLoading) {
    return <AppPageLoading />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title="Organization settings could not be loaded"
            variant="error"
          />
        </div>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  const canManageSetup = canManageOrganizationSetup(
    session.data.organization.role,
  );

  return (
    <SettingsContent
      canManageSetup={canManageSetup}
      onManageOrganization={() => openOrganizationProfile()}
      session={session.data}
    />
  );
}

function SettingsContent({
  canManageSetup,
  onManageOrganization,
  session,
}: {
  canManageSetup: boolean;
  onManageOrganization: () => void;
  session: OrganizationSession;
}) {
  const headerActions = canManageSetup ? (
    session.readiness.setupComplete ? (
      <Button onClick={onManageOrganization} type="button">
        <Settings2 aria-hidden="true" data-icon="inline-start" />
        Manage organization
      </Button>
    ) : (
      <Button asChild variant="outline">
        <Link href={routes.organizationSetup}>
          <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
          Finish setup
        </Link>
      </Button>
    )
  ) : null;

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={headerActions}
          eyebrow="Organization settings"
          title={session.organization.name}
        />

        <div className="grid gap-5">
          <ProfileSection canManageSetup={canManageSetup} session={session} />
          <TeamInvitationSection session={session} />
          <ComplianceSection session={session} />
        </div>
      </section>
    </main>
  );
}
