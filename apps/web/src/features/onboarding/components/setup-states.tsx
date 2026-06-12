import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { OnboardingItem } from './onboarding-item';

export function SetupPending({ organizationName }: { organizationName: string }) {
  const t = useTranslations('Onboarding');

  return (
    <OnboardingItem
      description={t('setupPendingDescription')}
      eyebrow={t('setupPendingEyebrow')}
      title={t('setupPendingTitle', { organizationName })}
    />
  );
}

export function SetupError({
  action,
  message,
  title,
}: {
  action?: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <OnboardingItem>
      <div className="flex items-start gap-3">
        <AlertCircle
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-destructive"
        />
        <div className="grid gap-1">
          <ItemTitle>{title}</ItemTitle>
          <ItemDescription>{message}</ItemDescription>
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </div>
    </OnboardingItem>
  );
}
