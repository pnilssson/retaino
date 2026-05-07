"use client";

import { useForm } from '@tanstack/react-form';
import {
  type ReactNode,
  useMemo,
  useState
} from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  canManageOrganizationSetup,
  legalDocumentUrl
} from '@retaino/shared/contracts';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiClientError } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { useActiveOrganizationBootstrap } from '../hooks/use-active-organization-bootstrap';
import { useCreateCurrentOrganizationAcceptances } from '../hooks/use-create-current-organization-acceptances';
import { useOrganizationSession } from '../hooks/use-organization-session';
import { useUpdateOrganizationProfile } from '../hooks/use-update-organization-profile';
import {
  complianceDocumentDescriptions,
  complianceDocumentLabels
} from '../onboarding.constants';
import type { OrganizationSession, UpdateOrganizationProfileInput } from '../types';
import { OnboardingFrame, type OnboardingStepId } from './onboarding-frame';
import { OrganizationRequired } from './organization-required';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ProfileDraft = Required<UpdateOrganizationProfileInput>;

const emptyDraft: ProfileDraft = {
  legalName: '',
  registrationNumber: '',
  billingEmail: '',
  responsibleName: '',
  responsibleEmail: '',
  responsiblePhone: ''
};

export function OnboardingScreen() {
  const organizationBootstrap = useActiveOrganizationBootstrap();
  const session = useOrganizationSession({
    enabled: organizationBootstrap.isReady,
  });

  if (
    !organizationBootstrap.isLoaded ||
    organizationBootstrap.isBootstrapping ||
    (!organizationBootstrap.isReady &&
      !organizationBootstrap.needsOrganization &&
      !organizationBootstrap.error) ||
    session.isLoading
  ) {
    return (
      <OnboardingFrame completedSteps={[]} currentStep="organization">
        <section className="pt-10">
          <p className="text-sm text-muted-foreground">
            Preparing organization setup.
          </p>
        </section>
      </OnboardingFrame>
    );
  }

  if (organizationBootstrap.needsOrganization) {
    return <OrganizationRequired />;
  }

  if (organizationBootstrap.error) {
    return (
      <OnboardingFrame completedSteps={[]} currentStep="organization">
        <SetupError
          message={
            organizationBootstrap.error.message ||
            'Refresh the page and try again.'
          }
          title="Organization setup could not be prepared"
        />
      </OnboardingFrame>
    );
  }

  if (session.isError) {
    if (
      session.error instanceof ApiClientError &&
      session.error.code === 'active_organization_required'
    ) {
      return <OrganizationRequired />;
    }

    return (
      <OnboardingFrame completedSteps={['organization']} currentStep="company">
        <SetupError
          action={
            <Button
              className="mt-4"
              onClick={() => void session.refetch()}
              size="sm"
              type="button"
              variant="outline"
            >
              Retry setup
            </Button>
          }
          message={session.error.message || 'Refresh the page and try again.'}
          title="Organization setup could not be loaded"
        />
      </OnboardingFrame>
    );
  }

  if (!session.data) {
    return null;
  }

  if (
    !session.data.readiness.ready &&
    !canManageOrganizationSetup(session.data.organization.role)
  ) {
    return (
      <OnboardingFrame completedSteps={['organization']} currentStep="company">
        <SetupPending organizationName={session.data.organization.name} />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFlow
      key={onboardingFlowKey(session.data)}
      session={session.data}
    />
  );
}

function OnboardingFlow({ session }: { session: OrganizationSession }) {
  const updateProfile = useUpdateOrganizationProfile();
  const createAcceptances = useCreateCurrentOrganizationAcceptances();
  const initialDraft = useMemo(() => profileToDraft(session), [session]);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(initialDraft);
  const [activeStep, setActiveStep] = useState<OnboardingStepId | 'ready'>(
    resolveInitialStep(session),
  );

  const completedSteps = completedStepsFor(session, activeStep);

  if (activeStep === 'ready') {
    return (
      <OnboardingFrame
        completedSteps={['organization', 'company', 'contact', 'agreements']}
        currentStep="agreements"
      >
        <ReadyStep organizationName={session.organization.name} />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame completedSteps={completedSteps} currentStep={activeStep}>
      {activeStep === 'company' ? (
        <CompanyStep
          defaultValues={profileDraft}
          onComplete={(value) => {
            setProfileDraft(value);
            setActiveStep('contact');
          }}
          organizationName={session.organization.name}
        />
      ) : activeStep === 'contact' ? (
        <ContactStep
          defaultValues={profileDraft}
          isPending={updateProfile.isPending}
          mutationError={updateProfile.error?.message ?? null}
          onBack={() => setActiveStep('company')}
          onComplete={async (value) => {
            await updateProfile.mutateAsync({
              ...value,
              responsiblePhone: value.responsiblePhone.trim() || undefined
            });
            setProfileDraft(value);
            setActiveStep(
              session.readiness.complianceComplete ? 'ready' : 'agreements',
            );
          }}
        />
      ) : (
        <AgreementsStep
          documents={session.requiredLegalDocuments}
          isPending={createAcceptances.isPending}
          missingAcceptanceTypes={session.readiness.missingAcceptanceTypes}
          mutationError={createAcceptances.error?.message ?? null}
          onBack={() => setActiveStep('contact')}
          onComplete={async () => {
            await createAcceptances.mutateAsync({
              documents: session.requiredLegalDocuments.map((document) => ({
                documentType:
                  document.documentType as keyof typeof complianceDocumentLabels,
                documentVersion: document.documentVersion
              }))
            });
            setActiveStep('ready');
          }}
        />
      )}
    </OnboardingFrame>
  );
}

function CompanyStep({
  defaultValues,
  onComplete,
  organizationName
}: {
  defaultValues: ProfileDraft;
  onComplete: (value: ProfileDraft) => void;
  organizationName: string;
}) {
  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => onComplete(value),
  });

  return (
    <section className="pt-4">
      <p className="text-sm text-muted-foreground">Company identity</p>
      <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
        Tell us who runs {organizationName}.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Retaino uses this identity for agreements, billing records, and
        organization-level audit evidence.
      </p>

      <form
        className="mt-8 grid gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field
          name="legalName"
          validators={{
            onChange: ({ value }) => validateRequired(
              value,
              'Enter the legal company name.',
            ),
            onSubmit: ({ value }) => validateRequired(
              value,
              'Enter the legal company name.',
            )
          }}
        >
          {(field) => (
            <TextInput
              error={getFieldError(field.state.meta.errors)}
              label="Legal company name"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              placeholder="Retaino AB"
              value={field.state.value}
            />
          )}
        </form.Field>
        <form.Field
          name="registrationNumber"
          validators={{
            onChange: ({ value }) => validateRequired(
              value,
              'Enter the registration number.',
            ),
            onSubmit: ({ value }) => validateRequired(
              value,
              'Enter the registration number.',
            )
          }}
        >
          {(field) => (
            <TextInput
              error={getFieldError(field.state.meta.errors)}
              label="Registration number"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              placeholder="559000-0000"
              value={field.state.value}
            />
          )}
        </form.Field>
        <div className="flex justify-end pt-2">
          <form.Subscribe selector={(state) => [state.canSubmit]}>
            {([canSubmit]) => (
              <Button disabled={!canSubmit} type="submit">
                Continue
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </section>
  );
}

function ContactStep({
  defaultValues,
  isPending,
  mutationError,
  onBack,
  onComplete
}: {
  defaultValues: ProfileDraft;
  isPending: boolean;
  mutationError: string | null;
  onBack: () => void;
  onComplete: (value: ProfileDraft) => Promise<void>;
}) {
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await onComplete(value);
    },
  });

  return (
    <section className="pt-4">
      <p className="text-sm text-muted-foreground">Responsible contact</p>
      <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
        Add the person accountable for campaigns.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        This contact is used for compliance, billing, and operational follow-up
        if a campaign needs review.
      </p>

      <form
        className="mt-8 grid gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field
          name="billingEmail"
          validators={{
            onChange: ({ value }) => validateEmail(value, 'billing email'),
            onSubmit: ({ value }) => validateEmail(value, 'billing email')
          }}
        >
          {(field) => (
            <TextInput
              error={getFieldError(field.state.meta.errors)}
              label="Billing email"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              placeholder="billing@example.com"
              type="email"
              value={field.state.value}
            />
          )}
        </form.Field>
        <form.Field
          name="responsibleName"
          validators={{
            onChange: ({ value }) => validateRequired(
              value,
              'Enter the responsible contact.',
            ),
            onSubmit: ({ value }) => validateRequired(
              value,
              'Enter the responsible contact.',
            )
          }}
        >
          {(field) => (
            <TextInput
              error={getFieldError(field.state.meta.errors)}
              label="Responsible contact"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              placeholder="Ada Lovelace"
              value={field.state.value}
            />
          )}
        </form.Field>
        <form.Field
          name="responsibleEmail"
          validators={{
            onChange: ({ value }) => validateEmail(value, 'responsible email'),
            onSubmit: ({ value }) => validateEmail(value, 'responsible email')
          }}
        >
          {(field) => (
            <TextInput
              error={getFieldError(field.state.meta.errors)}
              label="Responsible email"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              placeholder="ada@example.com"
              type="email"
              value={field.state.value}
            />
          )}
        </form.Field>
        <form.Field name="responsiblePhone">
          {(field) => (
            <TextInput
              error={getFieldError(field.state.meta.errors)}
              label="Responsible phone"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              placeholder="+46700000000"
              value={field.state.value}
            />
          )}
        </form.Field>

        {mutationError ? (
          <InlineError message={mutationError} title="Profile could not be saved" />
        ) : null}

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
                  ? 'Saving profile'
                  : 'Save and continue'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </section>
  );
}

function AgreementsStep({
  documents,
  isPending,
  missingAcceptanceTypes,
  mutationError,
  onBack,
  onComplete
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
      authorization: false
    },
    onSubmit: async () => {
      await onComplete();
    }
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
                      documentVersion: document.documentVersion
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
            onChange: ({ value }) => value
              ? undefined
              : 'Confirm that you are authorized to accept these documents.',
            onSubmit: ({ value }) => value
              ? undefined
              : 'Confirm that you are authorized to accept these documents.'
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

function ReadyStep({ organizationName }: { organizationName: string }) {
  return (
    <section className="pt-10">
      <p className="text-sm text-muted-foreground">Setup complete</p>
      <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
        {organizationName} is ready for customer reactivation.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        You can now import contacts, prepare audiences, and build campaigns with
        the required organization records in place.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={routes.contacts}>Import contacts</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.overview}>Go to workspace</Link>
        </Button>
      </div>
    </section>
  );
}

function SetupPending({ organizationName }: { organizationName: string }) {
  return (
    <section className="pt-10">
      <p className="text-sm text-muted-foreground">Setup pending</p>
      <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
        {organizationName} is still being set up.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        An organization admin needs to finish setup before members can use this
        workspace. You can switch to another organization if one is available.
      </p>
    </section>
  );
}

function TextInput({
  error,
  label,
  name,
  onBlur,
  onChange,
  placeholder,
  type = 'text',
  value
}: {
  error: string | null;
  label: string;
  name: keyof ProfileDraft;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        autoComplete="off"
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <p className="text-xs text-destructive" id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getFieldError(errors: unknown[]) {
  return errors[0] ? String(errors[0]) : null;
}

function SetupError({
  action,
  message,
  title
}: {
  action?: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <section className="pt-10">
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <span className="block">{message}</span>
          {action}
        </AlertDescription>
      </Alert>
    </section>
  );
}

function InlineError({ message, title }: { message: string; title: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function profileToDraft(session: OrganizationSession): ProfileDraft {
  if (!session.profile) {
    return emptyDraft;
  }

  return {
    legalName: session.profile.legalName,
    registrationNumber: session.profile.registrationNumber,
    billingEmail: session.profile.billingEmail,
    responsibleName: session.profile.responsibleName,
    responsibleEmail: session.profile.responsibleEmail,
    responsiblePhone: session.profile.responsiblePhone ?? ''
  };
}

function resolveInitialStep(
  session: OrganizationSession,
): OnboardingStepId | 'ready' {
  if (session.readiness.ready) {
    return 'ready';
  }

  if (!session.profile) {
    return 'company';
  }

  return 'agreements';
}

function onboardingFlowKey(session: OrganizationSession) {
  return [
    session.profile?.updatedAt ?? 'no-profile',
    session.readiness.ready ? 'ready' : 'open',
    session.readiness.missingAcceptanceTypes.join(',')
  ].join(':');
}

function completedStepsFor(
  session: OrganizationSession,
  activeStep: OnboardingStepId | 'ready',
): OnboardingStepId[] {
  const completed: OnboardingStepId[] = ['organization'];

  if (
    session.profile ||
    activeStep === 'contact' ||
    activeStep === 'agreements' ||
    activeStep === 'ready'
  ) {
    completed.push('company');
  }

  if (session.profile || activeStep === 'agreements' || activeStep === 'ready') {
    completed.push('contact');
  }

  if (session.readiness.complianceComplete || activeStep === 'ready') {
    completed.push('agreements');
  }

  return completed;
}

function validateEmail(value: string, label: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return `Enter the ${label}.`;
  }

  if (!EMAIL_PATTERN.test(normalizedValue)) {
    return 'Enter a valid email address.';
  }

  return undefined;
}

function validateRequired(value: string, message: string) {
  return value.trim() ? undefined : message;
}
