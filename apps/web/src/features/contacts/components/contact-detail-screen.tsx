"use client";

import { useForm } from '@tanstack/react-form';
import {
  ArrowLeft,
  PhoneOff,
  Loader2,
  MailX,
  Pencil,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useState } from 'react';
import {
  type ContactDetail,
  type ContactIssueCode,
  type ContactSuppression,
  type UpdateContactInput,
  normalizePhoneNumber,
} from '@retaino/shared/contracts';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DatePickerInput } from '@/components/date-picker-input';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/phone-input';
import { ItemTitle } from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { AppPageLoading } from '@/features/appshell/components/app-page-loading';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { ContentSection } from '@/features/appshell/components/content-section';
import { useContact } from '@/features/contacts/hooks/use-contact';
import { useDeleteContact } from '@/features/contacts/hooks/use-delete-contact';
import { useDeleteContactSuppression } from '@/features/contacts/hooks/use-delete-contact-suppression';
import { useSuppressContact } from '@/features/contacts/hooks/use-suppress-contact';
import { useUpdateContact } from '@/features/contacts/hooks/use-update-contact';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { BlockedContacts } from './blocked-contacts';
import {
  formatDate,
  formatDateTime,
} from '../contacts-format';
import { ContactStatusBadge } from './status-badge';

export function ContactDetailScreen({ contactId }: { contactId: string }) {
  const t = useTranslations('Contacts');
  const common = useTranslations('Common');
  const session = useOrganizationSession();
  const contact = useContact({
    contactId,
    enabled: Boolean(session.data?.readiness.ready),
    organizationId: session.data?.organization.id ?? null,
  });

  if (session.isLoading) {
    return <AppPageLoading />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title={t('contactLoadErrorTitle')}
            variant="error"
          />
        </div>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  if (!session.data.readiness.ready) {
    return <BlockedContacts session={session.data} />;
  }

  const latestContact = contact.data?.contact ?? null;
  const title = latestContact?.name ?? t('unnamedContact');

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <Button asChild className="px-0" variant="link">
              <Link aria-label={t('backToContacts')} href={routes.contacts}>
                <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                <span className="sm:hidden">{common('back')}</span>
                <span className="hidden sm:inline">{t('backToContacts')}</span>
              </Link>
            </Button>
          }
          eyebrow={t('contact')}
          title={title}
        />

        {contact.isError ? (
          <ItemNotice
            description={
              contact.error instanceof Error
                ? contact.error.message
                : common('tryAgainSoon')
            }
            title={t('contactFetchErrorTitle')}
            variant="error"
          />
        ) : contact.isLoading ? (
          <LoadingState className="py-8" label={t('loadingContact')} />
        ) : latestContact ? (
          <ContactDetailContent
            contact={latestContact}
            phoneCountryCode={session.data.profile?.countryCode ?? 'SE'}
          />
        ) : null}
      </section>
    </main>
  );
}

function ContactDetailContent({
  contact,
  phoneCountryCode,
}: {
  contact: ContactDetail;
  phoneCountryCode: string;
}) {
  const locale = useLocale();
  const t = useTranslations('Contacts');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="grid gap-5">
      <ContentSection
        actions={
          !isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  type="button"
                >
                  <Pencil aria-hidden="true" data-icon="inline-start" />
                  {t('edit')}
                </Button>
          ) : null
        }
        title={t('contactDetails')}
      >
          {isEditing ? (
            <ContactEditForm
              contact={contact}
              onCancel={() => setIsEditing(false)}
              onSaved={() => setIsEditing(false)}
              phoneCountryCode={phoneCountryCode}
            />
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField label={t('name')} value={contact.name ?? t('unnamed')} />
              <DetailField label={t('phone')} value={contact.phone ?? t('noPhone')} />
              <DetailField label={t('email')} value={contact.email ?? t('noEmail')} />
              <DetailField label={t('lastBooking')} value={formatDate(contact.lastBookingAt, locale, t('notSet'))} />
            </dl>
          )}
      </ContentSection>

      <ContentSection
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t('smsReadiness')}
            <ContactStatusBadge status={contact.contactStatus} />
          </span>
        }
      >
          {contact.contactIssues.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {contact.contactIssues.map((issue) => (
                <span
                  className={cn(
                    'rounded-md bg-muted px-2 py-1',
                    textStyles.mutedBody,
                  )}
                  key={issue}
                >
                  {formatContactIssueLabel(issue, t)}
                </span>
              ))}
            </div>
          ) : (
            <p className={textStyles.mutedBody}>
              {t('validPhoneDescription')}
            </p>
          )}
      </ContentSection>

      <ContentSection
        title={t('activity')}
      >
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailField label={t('lastContacted')} value={formatDate(contact.lastContactedAt, locale, t('notSet'))} />
            <DetailField label={t('imported')} value={formatDateTime(contact.createdAt, locale, t('notSet'))} />
            <DetailField label={t('updated')} value={formatDateTime(contact.updatedAt, locale, t('notSet'))} />
          </dl>
      </ContentSection>

      <ContactSuppressionSection
        contact={contact}
        locale={locale}
      />
      <DeleteContactSection contact={contact} />
    </div>
  );
}

function ContactEditForm({
  contact,
  onCancel,
  onSaved,
  phoneCountryCode,
}: {
  contact: ContactDetail;
  onCancel: () => void;
  onSaved: () => void;
  phoneCountryCode: string;
}) {
  const t = useTranslations('Contacts');
  const updateContact = useUpdateContact(
    contact.organizationId,
    contact.id,
    onSaved,
  );
  const form = useForm({
    defaultValues: contactToFormValues(contact, phoneCountryCode),
    onSubmit: async ({ value }) => {
      await updateContact.mutation.mutateAsync(
        contactFormValuesToInput(value),
      );
    },
  });

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="name">
          {(field) => (
            <FormField label={t('name')}>
              <Input
                name={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="phone">
          {(field) => (
            <FormField label={t('phone')}>
              <PhoneInput
                countryCode={form.getFieldValue('phoneCountryCode')}
                name={field.name}
                onChange={field.handleChange}
                onCountryChange={(value) =>
                  form.setFieldValue('phoneCountryCode', value)
                }
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <FormField label={t('email')}>
              <Input
                name={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                type="email"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="lastBookingAt">
          {(field) => (
            <FormField label={t('lastBooking')}>
              <LastBookingDatePicker
                name={field.name}
                onChange={field.handleChange}
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
      </div>
      {updateContact.error ? (
        <ItemNotice
          description={updateContact.error}
          title={t('contactSaveErrorTitle')}
          variant="error"
        />
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={updateContact.mutation.isPending}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          {t('cancel')}
        </Button>
        <Button disabled={updateContact.mutation.isPending} type="submit">
          {updateContact.mutation.isPending ? (
            <Loader2
              aria-hidden="true"
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          {t('saveContact')}
        </Button>
      </div>
    </form>
  );
}

function ContactSuppressionSection({
  contact,
  locale,
}: {
  contact: ContactDetail;
  locale: string;
}) {
  const t = useTranslations('Contacts');
  const suppress = useSuppressContact(contact.organizationId, contact.id);
  const unsuppress = useDeleteContactSuppression(
    contact.organizationId,
    contact.id,
  );
  const phoneSuppressed = contact.suppressions.some(
    (suppression) => suppression.type === 'phone',
  );
  const emailSuppressed = contact.suppressions.some(
    (suppression) => suppression.type === 'email',
  );

  return (
    <ContentSection
      title={t('suppressions')}
    >
        {contact.suppressions.length > 0 ? (
          <div className="divide-y">
            {contact.suppressions.map((suppression) => (
              <SuppressionRow
                isPending={
                  unsuppress.mutation.isPending &&
                  unsuppress.mutation.variables === suppression.id
                }
                key={suppression.id}
                locale={locale}
                onAllowAgain={() => unsuppress.mutation.mutate(suppression.id)}
                suppression={suppression}
              />
            ))}
          </div>
        ) : (
          <p className={textStyles.mutedBody}>
            {t('noSuppressions')}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!contact.phone || phoneSuppressed || suppress.mutation.isPending}
            onClick={() => suppress.mutation.mutate({ type: 'phone' })}
            type="button"
            variant="outline"
          >
            <PhoneOff aria-hidden="true" data-icon="inline-start" />
            {t('suppressPhone')}
          </Button>
          <Button
            disabled={!contact.email || emailSuppressed || suppress.mutation.isPending}
            onClick={() => suppress.mutation.mutate({ type: 'email' })}
            type="button"
            variant="outline"
          >
            <MailX aria-hidden="true" data-icon="inline-start" />
            {t('suppressEmail')}
          </Button>
        </div>
        {suppress.error || unsuppress.error ? (
          <ItemNotice
            description={suppress.error ?? unsuppress.error}
            title={t('suppressionUpdateErrorTitle')}
            variant="error"
          />
        ) : null}
    </ContentSection>
  );
}

function SuppressionRow({
  isPending,
  locale,
  onAllowAgain,
  suppression,
}: {
  isPending: boolean;
  locale: string;
  onAllowAgain: () => void;
  suppression: ContactSuppression;
}) {
  const t = useTranslations('Contacts');
  const method = suppression.type === 'phone' ? t('methodPhone') : t('methodEmail');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="grid min-w-0 gap-1">
        <ItemTitle>{method}</ItemTitle>
        <p className={cn('break-all', textStyles.body)}>{suppression.value}</p>
        <p className={textStyles.meta}>
          {formatSuppressionReasonLabel(suppression.reason, t)},{' '}
          {formatDateTime(suppression.createdAt, locale, t('notSet'))}
        </p>
      </div>
      <Button
        disabled={isPending}
        onClick={onAllowAgain}
        size="sm"
        type="button"
        variant="outline"
      >
        {isPending ? (
          <Loader2
            aria-hidden="true"
            className="animate-spin"
            data-icon="inline-start"
          />
        ) : (
          <Undo2 aria-hidden="true" data-icon="inline-start" />
        )}
        {t('allowAgain')}
      </Button>
    </div>
  );
}

function DeleteContactSection({ contact }: { contact: ContactDetail }) {
  const t = useTranslations('Contacts');
  const deleteContact = useDeleteContact(contact.organizationId, contact.id);

  return (
    <ContentSection
      actions={
            <ConfirmDialog
              confirmLabel={t('deletePermanently')}
              description={t('deleteContactDialogDescription')}
              isPending={deleteContact.mutation.isPending}
              onConfirm={() => deleteContact.mutation.mutateAsync()}
              title={t('deleteContactDialogTitle')}
              trigger={
                <Button type="button" variant="destructive">
                  <Trash2 aria-hidden="true" data-icon="inline-start" />
                  {t('delete')}
                </Button>
              }
              variant="destructive"
            />
      }
      description={t('deleteContactDescription')}
      title={t('deleteContact')}
    >
        {deleteContact.error ? (
          <ItemNotice
            description={deleteContact.error}
            title={t('contactDeleteErrorTitle')}
            variant="error"
          />
        ) : null}
    </ContentSection>
  );
}

function LastBookingDatePicker({
  name,
  onChange,
  value,
}: {
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <DatePickerInput
      id={name}
      name={name}
      onChange={onChange}
      value={value}
    />
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className={textStyles.meta}>{label}</dt>
      <dd className={textStyles.itemTitle}>{value}</dd>
    </div>
  );
}

function FormField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function formatContactIssueLabel(
  issue: ContactIssueCode,
  t: ReturnType<typeof useTranslations<'Contacts'>>,
) {
  switch (issue) {
    case 'invalid_phone':
      return t('issueInvalidPhone');
    case 'missing_consent':
      return t('issueMissingConsent');
    case 'missing_phone':
      return t('issueMissingPhone');
    case 'suppressed_phone':
      return t('issueSuppressedPhone');
  }
}

function formatSuppressionReasonLabel(
  reason: string,
  t: ReturnType<typeof useTranslations<'Contacts'>>,
) {
  if (reason === 'manual_contact_suppression') {
    return t('suppressionReasonManual');
  }

  return reason
    .split('_')
    .map((word) => word.trim())
    .filter(Boolean)
    .join(' ');
}

function contactToFormValues(contact: ContactDetail, phoneCountryCode = 'SE') {
  return {
    email: contact.email ?? '',
    lastBookingAt: dateInputValue(contact.lastBookingAt),
    name: contact.name ?? '',
    phone: contact.phone ?? '',
    phoneCountryCode,
  };
}

function contactFormValuesToInput(
  value: ReturnType<typeof contactToFormValues>,
): UpdateContactInput {
  const normalizedPhone = nullablePhoneFormValue(
    value.phone,
    value.phoneCountryCode,
  );

  return {
    email: nullableFormValue(value.email),
    lastBookingAt: value.lastBookingAt
      ? new Date(`${value.lastBookingAt}T00:00:00.000Z`).toISOString()
      : null,
    name: nullableFormValue(value.name),
    phone: normalizedPhone,
    phoneCountryCode: value.phoneCountryCode,
  };
}

function nullableFormValue(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function dateInputValue(value: string | null) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

function nullablePhoneFormValue(value: string, countryCode: string) {
  const trimmed = nullableFormValue(value);

  if (!trimmed) {
    return null;
  }

  const normalized = normalizePhoneNumber(trimmed, countryCode);

  return normalized.ok ? normalized.normalizedPhone : trimmed;
}
