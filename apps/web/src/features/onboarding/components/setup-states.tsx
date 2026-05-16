import type { ReactNode } from 'react';
import { AlertCircle, FileUp, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ItemDescription, ItemTitle } from '@/components/ui/item';
import { routes } from '@/lib/routes';
import { OnboardingItem } from './onboarding-item';

export function ReadyStep({ organizationName }: { organizationName: string }) {
  return (
    <OnboardingItem
      description="You can now import contacts, prepare audiences, and build campaigns with the required organization records in place."
      eyebrow="Setup complete"
      title={`${organizationName} is ready for customer reactivation.`}
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={routes.contacts}>
            <FileUp aria-hidden="true" data-icon="inline-start" />
            Import contacts
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.overview}>
            <LayoutDashboard aria-hidden="true" data-icon="inline-start" />
            Go to workspace
          </Link>
        </Button>
      </div>
    </OnboardingItem>
  );
}

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
