"use client";

import { useClerk } from '@clerk/nextjs';
import { LockKeyhole, UsersRound } from 'lucide-react';
import type { OrganizationSession } from '@retaino/shared/contracts';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle
} from '@/components/ui/item';

type TeamInvitationSectionProps = {
  session: OrganizationSession;
};

export function TeamInvitationSection({ session }: TeamInvitationSectionProps) {
  const { openOrganizationProfile } = useClerk();
  const canManageTeam = session.readiness.ready;

  return (
    <Item asChild className="grid items-stretch gap-5 px-5 py-5" variant="muted">
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
        </ItemHeader>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <ItemMedia
              className="mt-0.5 size-8 rounded-md bg-muted"
              variant="icon"
            >
              {canManageTeam ? (
                <UsersRound
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={1.5}
                />
              ) : (
                <LockKeyhole
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={1.5}
                />
              )}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                {canManageTeam
                  ? 'Organization access'
                  : 'Organization access is locked'}
              </ItemTitle>
              <ItemDescription>
                {canManageTeam
                  ? 'Open organization management to update members, invitations, roles, and profile details.'
                  : 'Complete profile and compliance setup before managing team access.'}
              </ItemDescription>
            </ItemContent>
          </div>
          <ItemActions className="w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto"
              disabled={!canManageTeam}
              onClick={() => openOrganizationProfile()}
              type="button"
              variant="outline"
            >
              Manage access
            </Button>
          </ItemActions>
        </div>
      </section>
    </Item>
  );
}
