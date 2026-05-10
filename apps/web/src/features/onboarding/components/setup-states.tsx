import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

export function ReadyStep({ organizationName }: { organizationName: string }) {
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

export function SetupPending({ organizationName }: { organizationName: string }) {
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
