"use client";

import { useClerk } from '@clerk/nextjs';
import type { OrganizationSession } from '@retaino/shared/contracts';
import { UsersRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ContentSection } from '@/features/appshell/components/content-section';
import { textStyles } from '@/lib/text-styles';

type TeamInvitationSectionProps = {
  session: OrganizationSession;
};

export function TeamInvitationSection({ session }: TeamInvitationSectionProps) {
  const t = useTranslations('Settings');
  const { openOrganizationProfile } = useClerk();
  const canManageTeam = session.readiness.setupComplete;

  return (
    <ContentSection
      actions={
            <Button
              disabled={!canManageTeam}
              onClick={() => openOrganizationProfile()}
              type="button"
            >
              <UsersRound aria-hidden="true" data-icon="inline-start" />
              {t('manage')}
            </Button>
      }
      description={
        <>
          {t('teamAccessDescription', {
            organizationName: session.organization.name,
          })}
        </>
      }
      id="team-access"
      title={
        <span className="flex flex-wrap items-center gap-2">
          {t('teamAccess')}
          {!canManageTeam ? (
            <span className={textStyles.mutedP}>
              {t('teamLocked')}
            </span>
          ) : null}
        </span>
      }
    />
  );
}
