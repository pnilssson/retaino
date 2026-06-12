"use client";

import { useForm } from '@tanstack/react-form';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { GuidedFlowActions } from '@/components/guided-flow';
import { Button } from '@/components/ui/button';
import {
  type OrganizationProfileFormValues as ProfileDraft,
  validateRequired,
} from '@/features/organization-profile/organization-profile-form';
import { ProfileInput } from '@/features/organization-profile/profile-input';
import { getFieldError } from '@/lib/form-errors';
import { OnboardingItem } from './onboarding-item';

export function CompanyStep({
  defaultValues,
  onComplete,
  organizationName,
}: {
  defaultValues: ProfileDraft;
  onComplete: (value: ProfileDraft) => void;
  organizationName: string;
}) {
  const t = useTranslations('Onboarding');
  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => onComplete(value),
  });

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <OnboardingItem
        description={t('companyDescription')}
        eyebrow={t('companyEyebrow')}
        title={t('companyTitle', { organizationName })}
      >
        <form.Field
          name="legalName"
          validators={{
            onBlur: ({ value }) =>
              validateRequired(value, t('legalCompanyNameRequired')),
            onSubmit: ({ value }) =>
              validateRequired(value, t('legalCompanyNameRequired')),
          }}
        >
          {(field) => (
            <ProfileInput
              error={getFieldError(field.state.meta.errors)}
              label={t('legalCompanyName')}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              placeholder={t('legalCompanyNamePlaceholder')}
              value={field.state.value}
            />
          )}
        </form.Field>
        <form.Field
          name="registrationNumber"
          validators={{
            onBlur: ({ value }) =>
              validateRequired(value, t('registrationNumberRequired')),
            onSubmit: ({ value }) =>
              validateRequired(value, t('registrationNumberRequired')),
          }}
        >
          {(field) => (
            <ProfileInput
              error={getFieldError(field.state.meta.errors)}
              label={t('registrationNumber')}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              placeholder="559000-0000"
              value={field.state.value}
            />
          )}
        </form.Field>
      </OnboardingItem>
      <GuidedFlowActions>
        <form.Subscribe selector={(state) => [state.canSubmit]}>
          {([canSubmit]) => (
            <Button disabled={!canSubmit} type="submit">
              {t('continue')}
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Button>
          )}
        </form.Subscribe>
      </GuidedFlowActions>
    </form>
  );
}
