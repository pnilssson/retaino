"use client";

import {
  appLegalDocumentUrl,
  canManageOrganizationSetup,
  type LegalBundleDocumentType,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { useForm } from '@tanstack/react-form';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { AppPageLoading } from '@/features/appshell/components/app-page-loading';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { ContentSection } from '@/features/appshell/components/content-section';
import { useCreateCurrentOrganizationLegalAcceptance } from '@/features/onboarding/hooks/use-create-current-organization-legal-acceptance';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { getFieldError } from '@/lib/form-errors';
import { getIntlLocale } from '@/lib/locale-format';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';

export function LegalOverviewScreen() {
  const t = useTranslations('Legal');
  const settings = useTranslations('Settings');
  const common = useTranslations('Common');
  const session = useOrganizationSession();

  if (session.isLoading) {
    return <AppPageLoading />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title={t('loadErrorTitle')}
            variant="error"
          />
        </div>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  const canManageSetup = canManageOrganizationSetup(
    session.data.organization.role,
  );
  const status = legalAgreementStatus(session.data, settings);

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <Button asChild className="px-0" variant="link">
              <Link href={routes.settings}>
                <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                <span className="sm:hidden">{common('back')}</span>
                <span className="hidden sm:inline">{t('backToOrganization')}</span>
              </Link>
            </Button>
          }
          badge={
            status ? (
              <StatusBadge label={status.label} tone={status.tone} />
            ) : undefined
          }
          description={t('overviewDescription')}
          eyebrow={settings('eyebrow')}
          title={settings('legalAgreement')}
        />

        <div className="grid gap-5">
          <CurrentBundleSection session={session.data} />
          <LegalDocumentsSection session={session.data} />
          <LegalAcceptanceSection
            canManageSetup={canManageSetup}
            session={session.data}
          />
        </div>
      </section>
    </main>
  );
}

function CurrentBundleSection({ session }: { session: OrganizationSession }) {
  const locale = useLocale();
  const t = useTranslations('Legal');

  return (
    <ContentSection title={t('currentBundleTitle')}>
      <dl className="grid gap-4 py-2 sm:grid-cols-3">
        <LegalMetadata
          label={t('bundleVersion')}
          value={session.legalBundle.version}
        />
        <LegalMetadata
          label={t('acceptedBy')}
          value={session.legalAcceptance?.acceptedByEmail ?? t('notAccepted')}
        />
        <LegalMetadata
          label={t('acceptedAt')}
          value={
            session.legalAcceptance
              ? formatDateTime(session.legalAcceptance.acceptedAt, locale)
              : t('notAccepted')
          }
        />
      </dl>
    </ContentSection>
  );
}

function LegalDocumentsSection({ session }: { session: OrganizationSession }) {
  const t = useTranslations('Legal');

  return (
    <ContentSection framed={false} title={t('documentsTitle')}>
      {session.legalBundle.documents.map((document) => {
        const documentType = document.documentType as LegalBundleDocumentType;
        const label = legalDocumentLabel(documentType, t);
        const description = legalDocumentDescription(documentType, t);
        const titleId = `legal-document-${document.id}-title`;

        return (
          <Item
            aria-labelledby={titleId}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-border bg-card px-4 py-4"
            key={document.id}
            variant="outline"
          >
            <ItemContent className="min-w-0 gap-3">
              <div className="grid min-w-0 gap-1">
                <ItemTitle id={titleId}>{label}</ItemTitle>
                <ItemDescription>{description}</ItemDescription>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <LegalMetadata
                  label={t('version')}
                  value={document.documentVersion}
                />
                <LegalMetadata
                  label={t('effectiveDate')}
                  value={document.effectiveDate}
                />
              </dl>
            </ItemContent>
            <ItemActions className="justify-self-end">
              <Button
                asChild
                className="shrink-0"
                size="sm"
                variant="outline"
              >
                <Link
                  href={appLegalDocumentUrl({
                    documentType: document.documentType,
                    documentVersion: document.documentVersion,
                  })}
                >
                  {t('open')}
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </Link>
              </Button>
            </ItemActions>
          </Item>
        );
      })}
    </ContentSection>
  );
}

function LegalMetadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className={textStyles.meta}>{label}</dt>
      <dd className={textStyles.itemTitle}>{value}</dd>
    </div>
  );
}

function legalDocumentLabel(
  documentType: LegalBundleDocumentType,
  t: ReturnType<typeof useTranslations<'Legal'>>,
) {
  switch (documentType) {
    case 'terms':
      return t('documentLabels.terms');
    case 'dpa':
      return t('documentLabels.dpa');
    case 'subprocessors':
      return t('documentLabels.subprocessors');
    case 'transfer_terms':
      return t('documentLabels.transfer_terms');
    case 'sending_policy':
      return t('documentLabels.sending_policy');
  }
}

function legalDocumentDescription(
  documentType: LegalBundleDocumentType,
  t: ReturnType<typeof useTranslations<'Legal'>>,
) {
  switch (documentType) {
    case 'terms':
      return t('documentDescriptions.terms');
    case 'dpa':
      return t('documentDescriptions.dpa');
    case 'subprocessors':
      return t('documentDescriptions.subprocessors');
    case 'transfer_terms':
      return t('documentDescriptions.transfer_terms');
    case 'sending_policy':
      return t('documentDescriptions.sending_policy');
  }
}

function LegalAcceptanceSection({
  canManageSetup,
  session,
}: {
  canManageSetup: boolean;
  session: OrganizationSession;
}) {
  const t = useTranslations('Legal');
  const createLegalAcceptance = useCreateCurrentOrganizationLegalAcceptance();
  const form = useForm({
    defaultValues: {
      authorization: false,
    },
    onSubmit: async () => {
      await createLegalAcceptance.mutateAsync();
      form.reset();
    },
  });

  if (session.readiness.legalUpdatesRequired && canManageSetup) {
    return (
      <ContentSection
        description={t('acceptDescription')}
        title={t('acceptTitle')}
      >
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
          >
            {createLegalAcceptance.error ? (
              <ItemNotice
                description={createLegalAcceptance.error.message}
                title={t('acceptErrorTitle')}
                variant="error"
              />
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <form.Field
                name="authorization"
                validators={{
                  onBlur: ({ value }) =>
                    value
                      ? undefined
                      : t('authorizationRequired'),
                  onSubmit: ({ value }) =>
                    value
                      ? undefined
                      : t('authorizationRequired'),
                }}
              >
                {(field) => {
                  const error = getFieldError(field.state.meta.errors);

                  return (
                    <div className="flex min-w-0 items-start gap-3">
                      <Checkbox
                        aria-describedby={
                          error
                            ? 'legal-updates-authorization-error'
                            : undefined
                        }
                        checked={field.state.value}
                        id="legal-updates-authorization"
                        onBlur={field.handleBlur}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                      />
                      <div className="grid gap-1">
                        <Label htmlFor="legal-updates-authorization">
                          {t('authorizationLabel')}
                        </Label>
                        <p className={textStyles.mutedBody}>
                          {t('authorizationHint')}
                        </p>
                        {error ? (
                          <p
                            className={textStyles.error}
                            id="legal-updates-authorization-error"
                          >
                            {error}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                }}
              </form.Field>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    disabled={
                      !canSubmit ||
                      isSubmitting ||
                      createLegalAcceptance.isPending
                    }
                    type="submit"
                  >
                    {isSubmitting || createLegalAcceptance.isPending ? (
                      <Loader2
                        aria-hidden="true"
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                    ) : (
                      <CheckCircle2
                        aria-hidden="true"
                        data-icon="inline-start"
                      />
                    )}
                    {t('acceptTitle')}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
      </ContentSection>
    );
  }

  if (session.readiness.legalUpdatesRequired) {
    return (
      <ItemNotice
        description={t('adminAcceptanceDescription')}
        title={t('adminAcceptanceTitle')}
        variant="warning"
      />
    );
  }

  return null;
}

function legalAgreementStatus(
  session: OrganizationSession,
  t: ReturnType<typeof useTranslations<'Settings'>>,
) {
  if (session.readiness.legalUpdatesRequired) {
    return {
      label: t('legalUpdatesRequired'),
      tone: 'amber',
    } as const;
  }

  if (session.readiness.legalCurrent) {
    return null;
  }

  return {
    label: t('setupIncomplete'),
    tone: 'amber',
  } as const;
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
