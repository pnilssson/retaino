"use client";

import {
  type FormEvent,
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
type FieldErrors = Partial<Record<keyof ProfileDraft | 'authorization', string>>;

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
  const [draft, setDraft] = useState<ProfileDraft>(initialDraft);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [activeStep, setActiveStep] = useState<OnboardingStepId | 'ready'>(
    resolveInitialStep(session),
  );
  const [authorized, setAuthorized] = useState(false);

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
          draft={draft}
          errors={fieldErrors}
          onChange={(field, value) => {
            setDraft((current) => ({ ...current, [field]: value }));
            setFieldErrors((current) => ({ ...current, [field]: undefined }));
          }}
          onSubmit={(event) => {
            event.preventDefault();
            const errors = validateCompany(draft);

            if (hasFieldErrors(errors)) {
              setFieldErrors(errors);
              return;
            }

            setFieldErrors({});
            setActiveStep('contact');
          }}
          organizationName={session.organization.name}
        />
      ) : activeStep === 'contact' ? (
        <ContactStep
          draft={draft}
          errors={fieldErrors}
          isPending={updateProfile.isPending}
          mutationError={updateProfile.error?.message ?? null}
          onBack={() => setActiveStep('company')}
          onChange={(field, value) => {
            setDraft((current) => ({ ...current, [field]: value }));
            setFieldErrors((current) => ({ ...current, [field]: undefined }));
          }}
          onSubmit={async (event) => {
            event.preventDefault();
            const errors = validateContact(draft);

            if (hasFieldErrors(errors)) {
              setFieldErrors(errors);
              return;
            }

            setFieldErrors({});
            await updateProfile.mutateAsync({
              ...draft,
              responsiblePhone: draft.responsiblePhone.trim() || undefined
            });
            setActiveStep(
              session.readiness.complianceComplete ? 'ready' : 'agreements',
            );
          }}
        />
      ) : (
        <AgreementsStep
          authorized={authorized}
          documents={session.requiredLegalDocuments}
          error={
            fieldErrors.authorization ??
            createAcceptances.error?.message ??
            null
          }
          isPending={createAcceptances.isPending}
          missingAcceptanceTypes={session.readiness.missingAcceptanceTypes}
          onAuthorizedChange={(checked) => {
            setAuthorized(checked);
            setFieldErrors((current) => ({
              ...current,
              authorization: undefined
            }));
          }}
          onBack={() => setActiveStep('contact')}
          onSubmit={async (event) => {
            event.preventDefault();

            if (!authorized) {
              setFieldErrors({
                authorization:
                  'Confirm that you are authorized to accept these documents.'
              });
              return;
            }

            setFieldErrors({});
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
  draft,
  errors,
  onChange,
  onSubmit,
  organizationName
}: {
  draft: ProfileDraft;
  errors: FieldErrors;
  onChange: (field: keyof ProfileDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  organizationName: string;
}) {
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

      <form className="mt-8 grid gap-5" noValidate onSubmit={onSubmit}>
        <TextInput
          error={errors.legalName ?? null}
          label="Legal company name"
          name="legalName"
          onChange={(value) => onChange('legalName', value)}
          placeholder="Retaino AB"
          value={draft.legalName}
        />
        <TextInput
          error={errors.registrationNumber ?? null}
          label="Registration number"
          name="registrationNumber"
          onChange={(value) => onChange('registrationNumber', value)}
          placeholder="559000-0000"
          value={draft.registrationNumber}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </section>
  );
}

function ContactStep({
  draft,
  errors,
  isPending,
  mutationError,
  onBack,
  onChange,
  onSubmit
}: {
  draft: ProfileDraft;
  errors: FieldErrors;
  isPending: boolean;
  mutationError: string | null;
  onBack: () => void;
  onChange: (field: keyof ProfileDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
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

      <form className="mt-8 grid gap-5" noValidate onSubmit={onSubmit}>
        <TextInput
          error={errors.billingEmail ?? null}
          label="Billing email"
          name="billingEmail"
          onChange={(value) => onChange('billingEmail', value)}
          placeholder="billing@example.com"
          type="email"
          value={draft.billingEmail}
        />
        <TextInput
          error={errors.responsibleName ?? null}
          label="Responsible contact"
          name="responsibleName"
          onChange={(value) => onChange('responsibleName', value)}
          placeholder="Ada Lovelace"
          value={draft.responsibleName}
        />
        <TextInput
          error={errors.responsibleEmail ?? null}
          label="Responsible email"
          name="responsibleEmail"
          onChange={(value) => onChange('responsibleEmail', value)}
          placeholder="ada@example.com"
          type="email"
          value={draft.responsibleEmail}
        />
        <TextInput
          error={errors.responsiblePhone ?? null}
          label="Responsible phone"
          name="responsiblePhone"
          onChange={(value) => onChange('responsiblePhone', value)}
          placeholder="+46700000000"
          value={draft.responsiblePhone}
        />

        {mutationError ? (
          <InlineError message={mutationError} title="Profile could not be saved" />
        ) : null}

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <Button onClick={onBack} type="button" variant="outline">
            Back
          </Button>
          <Button disabled={isPending} type="submit">
            {isPending ? 'Saving profile' : 'Save and continue'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function AgreementsStep({
  authorized,
  documents,
  error,
  isPending,
  missingAcceptanceTypes,
  onAuthorizedChange,
  onBack,
  onSubmit
}: {
  authorized: boolean;
  documents: OrganizationSession['requiredLegalDocuments'];
  error: string | null;
  isPending: boolean;
  missingAcceptanceTypes: OrganizationSession['readiness']['missingAcceptanceTypes'];
  onAuthorizedChange: (checked: boolean) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  const missing = new Set(missingAcceptanceTypes);

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

      <form className="mt-8 grid gap-6" onSubmit={onSubmit}>
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

        <div className="flex items-start gap-3">
          <Checkbox
            aria-describedby={error ? 'authorization-error' : undefined}
            checked={authorized}
            id="authorization"
            onCheckedChange={(checked) =>
              onAuthorizedChange(checked === true)
            }
          />
          <div className="grid gap-1">
            <Label htmlFor="authorization">
              I am authorized to accept these documents for this organization.
            </Label>
            <p className="text-sm leading-6 text-muted-foreground">
              Acceptance is recorded per document version for the active
              organization.
            </p>
            {error ? (
              <p className="text-xs text-destructive" id="authorization-error">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <Button onClick={onBack} type="button" variant="outline">
            Back
          </Button>
          <Button disabled={isPending} type="submit">
            {isPending ? 'Recording acceptance' : 'Accept and finish setup'}
          </Button>
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
  onChange,
  placeholder,
  type = 'text',
  value
}: {
  error: string | null;
  label: string;
  name: keyof ProfileDraft;
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

function validateCompany(draft: ProfileDraft): FieldErrors {
  return {
    legalName: draft.legalName.trim()
      ? undefined
      : 'Enter the legal company name.',
    registrationNumber: draft.registrationNumber.trim()
      ? undefined
      : 'Enter the registration number.'
  };
}

function validateContact(draft: ProfileDraft): FieldErrors {
  return {
    billingEmail: validateEmail(draft.billingEmail, 'billing email'),
    responsibleName: draft.responsibleName.trim()
      ? undefined
      : 'Enter the responsible contact.',
    responsibleEmail: validateEmail(
      draft.responsibleEmail,
      'responsible email',
    )
  };
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

function hasFieldErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}
