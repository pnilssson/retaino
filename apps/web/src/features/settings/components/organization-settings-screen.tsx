"use client";

import { useClerk } from '@clerk/nextjs';
import {
  canManageOrganizationSetup,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ItemGroup } from '@/components/ui/item';
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
    return (
      <main className="flex flex-1 bg-background">
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <p className="text-sm text-muted-foreground">
            Loading organization settings.
          </p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <Alert className="max-w-lg" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Organization settings could not be loaded</AlertTitle>
          <AlertDescription>{session.error.message}</AlertDescription>
        </Alert>
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
  const status = organizationSettingsStatus(session);
  const headerActions = canManageSetup ? (
    session.readiness.setupComplete ? (
      <Button onClick={onManageOrganization} type="button" variant="outline">
        Manage organization
      </Button>
    ) : (
      <Button asChild variant="outline">
        <Link href={routes.organizationSetup}>Finish setup</Link>
      </Button>
    )
  ) : null;

  return (
    <main className="flex flex-1 bg-background">
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={headerActions}
          badge={<Badge variant={status.badgeVariant}>{status.label}</Badge>}
          description="Manage organization identity, compliance records, and team access from one place."
          eyebrow="Organization settings"
          title={session.organization.name}
        />

        <ItemGroup className="gap-5">
          <ProfileSection canManageSetup={canManageSetup} session={session} />
          <TeamInvitationSection session={session} />
          <ComplianceSection canManageSetup={canManageSetup} session={session} />
        </ItemGroup>
      </section>
    </main>
  );
}

function organizationSettingsStatus(session: OrganizationSession) {
  if (session.readiness.ready) {
    return {
      badgeVariant: 'default',
      label: 'Ready',
    } as const;
  }

  if (session.readiness.legalUpdatesRequired) {
    return {
      badgeVariant: 'outline',
      label: 'Legal updates required',
    } as const;
  }

  return {
    badgeVariant: 'outline',
    label: 'Setup incomplete',
  } as const;
}
