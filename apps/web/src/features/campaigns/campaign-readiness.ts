import type { OrganizationSession } from '@retaino/shared/contracts';
import { routes } from '@/lib/routes';

export type CampaignReadinessText = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function campaignsAllowed(session: OrganizationSession) {
  return (
    session.readiness.ready &&
    session.readiness.legalCurrent &&
    !session.readiness.legalUpdatesRequired
  );
}

export function campaignReadinessBlock(session: OrganizationSession) {
  const legalUpdateRequired =
    session.readiness.legalUpdatesRequired || !session.readiness.legalCurrent;

  return {
    actionHref: legalUpdateRequired ? routes.legal : routes.organizationSetup,
  };
}

export function campaignReadinessBlockView(
  session: OrganizationSession,
  t: CampaignReadinessText,
) {
  const legalUpdateRequired =
    session.readiness.legalUpdatesRequired || !session.readiness.legalCurrent;

  return {
    actionLabel: legalUpdateRequired ? t('reviewLegalUpdates') : t('finishSetup'),
    badgeLabel: legalUpdateRequired ? t('legalUpdatesRequired') : t('setupRequired'),
    description: legalUpdateRequired
      ? t('legalUpdatesRequiredDescription')
      : t('setupRequiredDescription'),
    title: legalUpdateRequired
      ? t('legalUpdatesRequiredTitle')
      : t('setupRequiredTitle'),
  };
}
