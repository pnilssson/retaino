"use client";

import { useClerk } from '@clerk/nextjs';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OrganizationSession } from '@/features/onboarding/types';

type TeamInvitationSectionProps = {
  session: OrganizationSession;
};

export function TeamInvitationSection({ session }: TeamInvitationSectionProps) {
  const { openOrganizationProfile } = useClerk();
  const canInvite = session.readiness.ready;

  return (
    <section className="border-t pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-medium">Team invitation</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Invite teammates after profile and compliance setup are complete.
            Clerk manages organization members, invitations, and roles for{' '}
            {session.organization.name}.
          </p>
        </div>
        <Button
          disabled={!canInvite}
          onClick={() => openOrganizationProfile()}
          type="button"
        >
          <UserPlus aria-hidden="true" strokeWidth={1.5} />
          Invite team
        </Button>
      </div>
    </section>
  );
}
