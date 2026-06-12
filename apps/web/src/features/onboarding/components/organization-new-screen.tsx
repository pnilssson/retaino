import { useTranslations } from 'next-intl';
import { OrganizationCreateForm } from './organization-create-form';
import { OnboardingFrame } from './onboarding-frame';

export function OrganizationNewScreen() {
  const t = useTranslations('Onboarding');

  return (
    <OnboardingFrame completedSteps={[]} currentStep="organization">
      <OrganizationCreateForm
        description={t('organizationNewDescription')}
        submitLabel={t('createWorkspace')}
        title={t('organizationNewTitle')}
      />
    </OnboardingFrame>
  );
}
