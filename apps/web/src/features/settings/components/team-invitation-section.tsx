"use client";

import { useClerk } from '@clerk/nextjs';
import type { OrganizationSession } from '@retaino/shared/contracts';
import { UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle
} from '@/components/ui/item';
import { AppPageItem } from '@/features/appshell/components/app-page-content';

type TeamInvitationSectionProps = {
  session: OrganizationSession;
};

export function TeamInvitationSection({ session }: TeamInvitationSectionProps) {
  const { openOrganizationProfile } = useClerk();
  const canManageTeam = session.readiness.setupComplete;

  return (
    <AppPageItem asChild>
      <section id="team-access">
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle className="flex-wrap text-base">
              Team access
              {!canManageTeam ? (
                <span className="text-sm text-muted-foreground">
                  Locked until setup is complete
                </span>
              ) : null}
            </ItemTitle>
            <ItemDescription className="max-w-2xl">
              Manage members, invitations, roles, and organization details for{' '}
              {session.organization.name}.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              disabled={!canManageTeam}
              onClick={() => openOrganizationProfile()}
              type="button"
              variant="outline"
            >
              <UsersRound aria-hidden="true" data-icon="inline-start" />
              Manage access
            </Button>
          </ItemActions>
        </ItemHeader>
      </section>
    </AppPageItem>
  );
}
