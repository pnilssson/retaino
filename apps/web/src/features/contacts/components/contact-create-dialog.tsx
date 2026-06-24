"use client";

import { useForm } from '@tanstack/react-form';
import { dateOnlyToUtcDate } from '@retaino/shared';
import type { CreateContactInput } from '@retaino/shared/contracts';
import {
  Loader2,
  Plus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { DatePickerInput } from '@/components/date-picker-input';
import { ItemNotice } from '@/components/item-notice';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { useCreateContact } from '../hooks/use-create-contact';

type ContactCreateFormValues = {
  email: string;
  lastBookingAt: string;
  marketingSmsAllowed: boolean;
  name: string;
  phone: string;
  phoneCountryCode: string;
};

export function ContactCreateDialog({
  defaultPhone = '',
  onOpenChange,
  open,
  organizationId,
  phoneCountryCode = 'SE',
}: {
  defaultPhone?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: string | null;
  phoneCountryCode?: string;
}) {
  const common = useTranslations('Common');
  const t = useTranslations('Contacts');
  const createContact = useCreateContact({ organizationId });
  const resetCreateContact = createContact.reset;
  const form = useForm({
    defaultValues: initialContactCreateFormValues({
      phone: defaultPhone,
      phoneCountryCode,
    }),
    onSubmit: async ({ value }) => {
      const input = contactCreateFormValuesToInput(value);

      if (!input.phone) {
        return;
      }

      try {
        await createContact.mutateAsync(input);
      } catch {
        return;
      }

      toast.success(t('contactCreated'));
      form.reset();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      resetCreateContact();
      form.reset();
      form.setFieldValue('phone', defaultPhone);
      form.setFieldValue('phoneCountryCode', phoneCountryCode);
    }
  }, [defaultPhone, form, open, phoneCountryCode, resetCreateContact]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl" closeLabel={common('close')}>
        <DialogHeader>
          <DialogTitle>{t('addContact')}</DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-5"
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
                <FormField htmlFor={field.name} label={t('name')}>
                  <Input
                    autoComplete="name"
                    id={field.name}
                    name={field.name}
                    onChange={(event) => field.handleChange(event.target.value)}
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>
            <form.Field name="email">
              {(field) => (
                <FormField htmlFor={field.name} label={t('email')}>
                  <Input
                    autoComplete="email"
                    id={field.name}
                    name={field.name}
                    onChange={(event) => field.handleChange(event.target.value)}
                    spellCheck={false}
                    type="email"
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>
            <form.Field
              name="phone"
              validators={{
                onSubmit: ({ value }) =>
                  value.trim() ? undefined : t('phoneRequired'),
              }}
            >
              {(field) => {
                const error = field.state.meta.errors[0];

                return (
                  <FormField
                    className="sm:col-span-2"
                    htmlFor={field.name}
                    label={t('phone')}
                  >
                    <PhoneInput
                      aria-describedby={
                        error ? `${field.name}-error` : undefined
                      }
                      aria-invalid={Boolean(error)}
                      countryCode={form.getFieldValue('phoneCountryCode')}
                      id={field.name}
                      name={field.name}
                      onChange={field.handleChange}
                      onCountryChange={(value) =>
                        form.setFieldValue('phoneCountryCode', value)
                      }
                      value={field.state.value}
                    />
                    {error ? (
                      <p
                        className={textStyles.error}
                        id={`${field.name}-error`}
                        role="alert"
                      >
                        {String(error)}
                      </p>
                    ) : null}
                  </FormField>
                );
              }}
            </form.Field>
            <form.Field name="lastBookingAt">
              {(field) => (
                <FormField
                  className="sm:col-span-2"
                  htmlFor={field.name}
                  label={t('lastBooking')}
                >
                  <DatePickerInput
                    id={field.name}
                    name={field.name}
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>
          </div>

          <form.Field name="marketingSmsAllowed">
            {(field) => (
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={field.state.value}
                  id={field.name}
                  onBlur={field.handleBlur}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
                <Label htmlFor={field.name}>
                  {t('marketingSmsAllowedLabel')}
                </Label>
              </div>
            )}
          </form.Field>

          {createContact.error ? (
            <ItemNotice
              description={
                createContact.error instanceof Error
                  ? createContact.error.message
                  : t('contactSaveErrorDescription')
              }
              title={t('contactSaveErrorTitle')}
              variant="error"
            />
          ) : null}

          <DialogFooter>
            <Button disabled={createContact.isPending} type="submit">
              {createContact.isPending ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Plus aria-hidden="true" data-icon="inline-start" />
              )}
              {createContact.isPending ? t('savingContact') : t('saveContact')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  children,
  className,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function initialContactCreateFormValues(input: {
  phone: string;
  phoneCountryCode: string;
}): ContactCreateFormValues {
  return {
    email: '',
    lastBookingAt: '',
    marketingSmsAllowed: false,
    name: '',
    phone: input.phone,
    phoneCountryCode: input.phoneCountryCode,
  };
}

function contactCreateFormValuesToInput(
  value: ContactCreateFormValues,
): CreateContactInput {
  return {
    email: nullableFormValue(value.email),
    lastBookingAt: value.lastBookingAt
      ? dateOnlyToUtcDate(value.lastBookingAt).toISOString()
      : null,
    marketingSmsAllowed: value.marketingSmsAllowed,
    name: nullableFormValue(value.name),
    phone: value.phone.trim(),
    phoneCountryCode: value.phoneCountryCode,
  };
}

function nullableFormValue(value: string) {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}
