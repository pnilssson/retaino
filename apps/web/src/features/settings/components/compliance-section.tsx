import type { OrganizationSession } from '@retaino/shared/contracts';
import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ContentSection } from '@/features/appshell/components/content-section';
import { routes } from '@/lib/routes';

export function ComplianceSection({
  session,
}: {
  session: OrganizationSession;
}) {
  const t = useTranslations('Settings');
  const status = legalAgreementStatus(session, t);

  return (
    <ContentSection
      actions={
            <Button asChild type="button">
              <Link href={routes.legal}>
                <FileText aria-hidden="true" data-icon="inline-start" />
                {t('view')}
              </Link>
            </Button>
      }
      description={status.description}
      id="legal-agreement"
      title={t('legalAgreement')}
    />
  );
}

function legalAgreementStatus(
  session: OrganizationSession,
  t: ReturnType<typeof useTranslations<'Settings'>>,
) {
  if (session.readiness.legalCurrent) {
    return {
      description: t('legalCurrentDescription'),
    } as const;
  }

  if (session.readiness.legalUpdatesRequired) {
    return {
      description: t('legalUpdatesDescription'),
    } as const;
  }

  return {
    description: t('legalSetupDescription'),
  } as const;
}
