"use client";

import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { useEmailCodeAuth } from '@/features/auth/hooks/use-email-code-auth';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

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
        className={cn(
          'border border-destructive/25 bg-destructive/5 p-4',
          textStyles.error,
        )}
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
