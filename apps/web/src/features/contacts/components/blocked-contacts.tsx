import {
  CheckCircle2,
  FileText,
} from 'lucide-react';
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
  const canManageSetup = canManageOrganizationSetup(session.organization.role);
  const blocker = session.eligibility.contactImports.blocker;
  const legalUpdateRequired = blocker === 'legal_update_required';
  const title = legalUpdateRequired
    ? 'Legal updates required before importing contacts'
    : 'Finish setup before importing contacts';
  const description = legalUpdateRequired
    ? 'Updated legal terms must be accepted before contact data can be imported.'
    : 'Company profile and legal agreement acceptance are required before contact data can be imported.';
  const alertTitle = legalUpdateRequired
    ? 'Contact imports are paused'
    : 'Contacts are blocked';
  const alertDescription = legalUpdateRequired
    ? canManageSetup
      ? 'Review and accept the updated legal terms to resume CSV uploads and imports.'
      : 'An organization admin needs to accept the updated legal terms before CSV uploads and imports can continue.'
    : 'Complete organization setup to enable CSV uploads, validation, dedupe, suppression checks, and contact status.';
  const actionHref = legalUpdateRequired
    ? routes.legal
    : routes.organizationSetup;
  const actionLabel = legalUpdateRequired
    ? canManageSetup
      ? 'Review legal updates'
      : 'View legal'
    : 'Finish setup';

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <AppPageHeader
          badge={
            <StatusBadge
              label={
                legalUpdateRequired
                  ? 'Legal updates required'
                  : 'Setup required'
              }
              tone="amber"
            />
          }
          description={description}
          eyebrow="Contacts"
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
