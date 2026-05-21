import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { ItemDescription, ItemTitle } from '@/components/ui/item';
import { OnboardingItem } from './onboarding-item';

export function SetupPending({ organizationName }: { organizationName: string }) {
  return (
    <OnboardingItem
      description="An organization admin needs to finish setup before members can use this workspace. You can switch to another organization if one is available."
      eyebrow="Setup pending"
      title={`${organizationName} is still being set up.`}
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
