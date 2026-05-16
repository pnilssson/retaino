"use client";

import {
  legalDocumentUrl,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { textStyles } from '@/lib/text-styles';
import { legalBundleDocumentLabels } from '../onboarding.constants';
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
  return (
    <OnboardingItem
      description="These documents apply to this Retaino workspace."
      eyebrow="Legal"
      title="Finish setup."
    >
      <div className="grid gap-6">
        <p className={textStyles.mutedBody}>
          Documents:{' '}
          {legalBundle.documents.map((document, index) => {
            const label =
              legalBundleDocumentLabels[
                document.documentType as keyof typeof legalBundleDocumentLabels
              ] ?? document.title;
            const separator =
              index === legalBundle.documents.length - 1
                ? ''
                : index === legalBundle.documents.length - 2
                  ? ', and '
                  : ', ';

            return (
              <span key={document.id}>
                <Link
                  className="font-medium text-foreground underline-offset-4 hover:underline"
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
          By finishing setup, you agree to the documents above.
        </p>

        {mutationError ? (
          <p className={textStyles.error}>{mutationError}</p>
        ) : null}

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <Button onClick={onBack} type="button" variant="outline">
            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
            Back
          </Button>
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
            {isPending ? 'Finishing setup' : 'Finish setup'}
          </Button>
        </div>
      </div>
    </OnboardingItem>
  );
}
