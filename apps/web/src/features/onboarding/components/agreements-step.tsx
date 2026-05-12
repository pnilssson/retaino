"use client";

import { useForm } from '@tanstack/react-form';
import {
  legalDocumentUrl,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getFieldError } from '@/lib/form-errors';
import { legalBundleDocumentLabels } from '../onboarding.constants';

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
      <p className="text-sm text-muted-foreground">Legal</p>
      <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
        Accept Retaino legal terms.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        One agreement covers the terms, data processing terms, sending policy,
        and related policies for this organization.
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
        <p className="text-sm leading-6 text-muted-foreground">
          By continuing, you agree to the{' '}
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
                    I am authorized to agree to Retaino Terms, Data Processing
                    Terms, Sending Policy, and related policies for this
                    organization.
                  </Label>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Acceptance is recorded once for the current legal bundle.
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
