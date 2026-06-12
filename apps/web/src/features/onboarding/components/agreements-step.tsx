"use client";

import {
  legalDocumentUrl,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { GuidedFlowActions } from '@/components/guided-flow';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { textStyles } from '@/lib/text-styles';
import { OnboardingItem } from './onboarding-item';

export function AgreementsStep({
  legalBundle,
  isPending,
  mutationError,
  onBack,
  onComplete,
}: {
  legalBundle: OrganizationSession['legalBundle'];
  isPending: boolean;
  mutationError: string | null;
  onBack: () => void;
  onComplete: () => Promise<void>;
}) {
  const t = useTranslations('Onboarding');

  return (
    <div className="grid gap-5">
      <OnboardingItem
        eyebrow={t('agreementsEyebrow')}
        title={t('agreementsTitle')}
      >
        <div className="grid gap-6">
          <p className={textStyles.mutedBody}>
            {t('documents')}:{' '}
            {legalBundle.documents.map((document, index) => {
              const label = documentLabel(document.documentType, document.title, t);
              const separator =
                index === legalBundle.documents.length - 1
                  ? ''
                  : index === legalBundle.documents.length - 2
                    ? `, ${t('listAnd')} `
                    : ', ';

              return (
                <span key={document.id}>
                  <Link
                    className="text-foreground underline-offset-4 hover:underline"
                    href={legalDocumentUrl({
                      documentType: document.documentType,
                      documentVersion: document.documentVersion,
                    })}
                    target="_blank"
                  >
                    {label}
                  </Link>
                  {separator}
                </span>
              );
            })}
            .
          </p>

          <p className={textStyles.mutedBody}>
            {t('agreementsDescription')}
          </p>

          {mutationError ? (
            <ItemNotice
              description={mutationError}
              title={t('legalAcceptErrorTitle')}
              variant="error"
            />
          ) : null}
        </div>
      </OnboardingItem>
      <GuidedFlowActions
        backLabel={
          <>
            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
            {t('back')}
          </>
        }
        onBack={onBack}
      >
        <Button
          disabled={isPending}
          onClick={() => {
            void onComplete().catch(() => undefined);
          }}
          type="button"
        >
          {isPending ? (
            <Loader2
              aria-hidden="true"
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : (
            <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
          )}
          {isPending ? t('finishingSetup') : t('finishSetup')}
        </Button>
      </GuidedFlowActions>
    </div>
  );
}

function documentLabel(
  documentType: string,
  fallback: string,
  t: ReturnType<typeof useTranslations<'Onboarding'>>,
) {
  switch (documentType) {
    case 'terms':
      return t('documentTerms');
    case 'dpa':
      return t('documentDpa');
    case 'subprocessors':
      return t('documentSubprocessors');
    case 'transfer_terms':
      return t('documentTransferTerms');
    case 'sending_policy':
      return t('documentSendingPolicy');
    default:
      return fallback;
  }
}
