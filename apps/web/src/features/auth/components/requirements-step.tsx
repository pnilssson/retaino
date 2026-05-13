"use client";

import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { useEmailCodeAuth } from '@/features/auth/hooks/use-email-code-auth';

type EmailCodeAuth = ReturnType<typeof useEmailCodeAuth>;

export function RequirementsStep({
  auth,
  formError,
}: {
  auth: EmailCodeAuth;
  formError: string | null;
}) {
  return (
    <div className="grid gap-5">
      <div
        className="border border-destructive/25 bg-destructive/5 p-4 text-sm leading-6 text-destructive"
        role="alert"
      >
        {formError ??
          'This account needs more information before it can be created.'}
      </div>
      <Button
        className="h-12 px-4"
        disabled={auth.isFetching}
        onClick={() => void auth.reset()}
        size="lg"
        type="button"
        variant="outline"
      >
        <Mail aria-hidden="true" data-icon="inline-start" />
        Use a different email
      </Button>
    </div>
  );
}
