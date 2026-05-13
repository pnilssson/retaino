import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
          <Link href={routes.contacts}>Import contacts</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.overview}>Go to workspace</Link>
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
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <span className="block">{message}</span>
          {action}
        </AlertDescription>
      </Alert>
    </OnboardingItem>
  );
}
