import type { OrganizationSession } from '@retaino/shared/contracts';
import { FileText } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ContentSection } from '@/features/appshell/components/content-section';
import { routes } from '@/lib/routes';

export function ComplianceSection({
  session,
}: {
  session: OrganizationSession;
}) {
  const status = legalAgreementStatus(session);

  return (
    <ContentSection
      actions={
            <Button asChild type="button">
              <Link href={routes.legal}>
                <FileText aria-hidden="true" data-icon="inline-start" />
                View
              </Link>
            </Button>
      }
      description={status.description}
      id="legal-agreement"
      title="Legal agreement"
    />
  );
}

function legalAgreementStatus(session: OrganizationSession) {
  if (session.readiness.legalCurrent) {
    return {
      description: 'Current legal bundle accepted for this organization.',
    } as const;
  }

  if (session.readiness.legalUpdatesRequired) {
    return {
      description:
        'Updated legal terms must be accepted before imports or campaigns can continue.',
    } as const;
  }

  return {
    description: 'Legal terms must be accepted to finish organization setup.',
  } as const;
}
