"use client";

import { useForm } from '@tanstack/react-form';
import {
  legalDocumentUrl,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getFieldError } from '@/lib/form-errors';
import {
  complianceDocumentDescriptions,
  complianceDocumentLabels,
} from '../onboarding.constants';

export function AgreementsStep({
  documents,
  isPending,
  missingAcceptanceTypes,
  mutationError,
  onBack,
  onComplete,
}: {
  documents: OrganizationSession['requiredLegalDocuments'];
  isPending: boolean;
  missingAcceptanceTypes: OrganizationSession['readiness']['missingAcceptanceTypes'];
  mutationError: string | null;
  onBack: () => void;
  onComplete: () => Promise<void>;
}) {
  const missing = new Set(missingAcceptanceTypes);
  const form = useForm({
    defaultValues: {
      authorization: false,
    },
    onSubmit: async () => {
      await onComplete();
    },
  });

  return (
    <section className="pt-4">
      <p className="text-sm text-muted-foreground">Agreements</p>
      <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
        Accept the documents required to run campaigns.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        These records confirm the organization can import contacts and use
        Retaino for compliant customer reactivation.
      </p>

      <form
        className="mt-8 grid gap-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div className="divide-y border-y">
          {documents.map((document) => {
            const documentType =
              document.documentType as keyof typeof complianceDocumentLabels;
            const isAccepted = !missing.has(documentType);
            const title =
              complianceDocumentLabels[documentType] ?? document.title;

            return (
              <div
                className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                key={document.id}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isAccepted ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-4 text-foreground"
                        strokeWidth={1.5}
                      />
                    ) : null}
                    <p className="text-sm font-medium">{title}</p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {complianceDocumentDescriptions[documentType]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Version {document.documentVersion}
                  </p>
                </div>
                <Button asChild type="button" variant="outline">
                  <Link
                    href={legalDocumentUrl({
                      documentType: document.documentType,
                      documentVersion: document.documentVersion,
                    })}
                    target="_blank"
                  >
                    Read
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>

        <form.Field
          name="authorization"
          validators={{
            onChange: ({ value }) =>
              value
                ? undefined
                : 'Confirm that you are authorized to accept these documents.',
            onSubmit: ({ value }) =>
              value
                ? undefined
                : 'Confirm that you are authorized to accept these documents.',
          }}
        >
          {(field) => {
            const error =
              mutationError ?? getFieldError(field.state.meta.errors);

            return (
              <div className="flex items-start gap-3">
                <Checkbox
                  aria-describedby={error ? 'authorization-error' : undefined}
                  checked={field.state.value}
                  id={field.name}
                  onBlur={field.handleBlur}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
                <div className="grid gap-1">
                  <Label htmlFor={field.name}>
                    I am authorized to accept these documents for this
                    organization.
                  </Label>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Acceptance is recorded per document version for the active
                    organization.
                  </p>
                  {error ? (
                    <p
                      className="text-xs text-destructive"
                      id="authorization-error"
                    >
                      {error}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          }}
        </form.Field>

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <Button onClick={onBack} type="button" variant="outline">
            Back
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                disabled={!canSubmit || isPending || isSubmitting}
                type="submit"
              >
                {isPending || isSubmitting
                  ? 'Recording acceptance'
                  : 'Accept and finish setup'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </section>
  );
}
