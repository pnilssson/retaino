import {
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  canManageOrganizationSetup,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { ContentSection } from '@/features/appshell/components/content-section';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { routes } from '@/lib/routes';

export function BlockedContacts({ session }: { session: OrganizationSession }) {
  const t = useTranslations('Contacts');
  const canManageSetup = canManageOrganizationSetup(session.organization.role);
  const blocker = session.eligibility.contactImports.blocker;
  const legalUpdateRequired = blocker === 'legal_update_required';
  const title = legalUpdateRequired
    ? t('blockedLegalTitle')
    : t('blockedSetupTitle');
  const description = legalUpdateRequired
    ? t('blockedLegalDescription')
    : t('blockedSetupDescription');
  const alertTitle = legalUpdateRequired
    ? t('blockedLegalAlertTitle')
    : t('blockedSetupAlertTitle');
  const alertDescription = legalUpdateRequired
    ? canManageSetup
      ? t('blockedLegalManageDescription')
      : t('blockedLegalMemberDescription')
    : t('blockedSetupAlertDescription');
  const actionHref = legalUpdateRequired
    ? routes.legal
    : routes.organizationSetup;
  const actionLabel = legalUpdateRequired
    ? canManageSetup
      ? t('reviewLegalUpdates')
      : t('viewLegal')
    : t('finishSetup');

  return (
    <main className="flex flex-1 items-start bg-background" id="main-content">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <AppPageHeader
          badge={
            <StatusBadge
              label={
                legalUpdateRequired
                  ? t('legalUpdatesRequired')
                  : t('setupRequired')
              }
              tone="amber"
            />
          }
          description={description}
          eyebrow={t('contactsTitle')}
          title={title}
        />
        <div className="grid gap-5">
          <ContentSection asChild>
            <section>
              <ItemNotice
                description={alertDescription}
                title={alertTitle}
                variant="warning"
              />
              <div className="flex justify-end">
                <Button asChild>
                  <Link href={actionHref}>
                    {legalUpdateRequired ? (
                      <FileText aria-hidden="true" data-icon="inline-start" />
                    ) : (
                      <CheckCircle2
                        aria-hidden="true"
                        data-icon="inline-start"
                      />
                    )}
                    {actionLabel}
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
