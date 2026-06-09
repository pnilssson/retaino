"use client";

import { useForm } from '@tanstack/react-form';
import {
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { useEmailCodeAuth } from '@/features/auth/hooks/use-email-code-auth';
import { getFieldError } from '@/lib/form-errors';
import { textStyles } from '@/lib/text-styles';
import { emailPattern } from '../form-constants';

type EmailCodeAuth = ReturnType<typeof useEmailCodeAuth>;

type EmailFormValues = {
  email: string;
};

export function EmailStep({ auth }: { auth: EmailCodeAuth }) {
  const emailForm = useForm({
    defaultValues: {
      email: '',
    } satisfies EmailFormValues,
    onSubmit: async ({ value }) => {
      await auth.submitEmail(value.email);
    },
  });
  const emailServerError =
    auth.error?.field === 'email' ? auth.error.message : null;

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void emailForm.handleSubmit();
      }}
    >
      <emailForm.Field
        name="email"
        validators={{
          onBlur: ({ value }) => validateEmail(value),
          onSubmit: ({ value }) => validateEmail(value),
        }}
      >
        {(field) => {
          const clientError = getFieldError(field.state.meta.errors);
          const emailError =
            emailServerError ??
            (field.state.meta.isBlurred ? clientError : null);

          return (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Email</Label>
              <Input
                aria-describedby={
                  emailError ? 'email-error' : undefined
                }
                aria-invalid={Boolean(emailError)}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                className="h-12"
                disabled={auth.isFetching}
                id={field.name}
                inputMode="email"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="name@example.com"
                type="email"
                value={field.state.value}
              />
              {emailError ? (
                <p
                  className={textStyles.error}
                  id="email-error"
                  role="alert"
                >
                  {emailError}
                </p>
              ) : null}
            </div>
          );
        }}
      </emailForm.Field>

      <emailForm.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
      >
        {([canSubmit, isSubmitting]) => (
          <Button
            className="h-12 gap-2 px-4"
            disabled={!canSubmit || auth.isFetching}
            size="lg"
            type="submit"
          >
            {isSubmitting || auth.isFetching ? (
              <>
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
                Sending code
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="size-4" data-icon="inline-end" />
              </>
            )}
          </Button>
        )}
      </emailForm.Subscribe>
    </form>
  );
}

function validateEmail(value: string) {
  const normalizedEmail = value.trim().toLowerCase();

  if (!normalizedEmail) {
    return 'Enter your email address.';
  }

  if (!emailPattern.test(normalizedEmail)) {
    return 'Enter a full email address, for example name@example.com.';
  }

  return undefined;
}
