"use client";

import { useForm } from '@tanstack/react-form';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import type { useEmailCodeAuth } from '@/features/auth/hooks/use-email-code-auth';
import { getFieldError } from '@/lib/form-errors';
import { textStyles } from '@/lib/text-styles';
import { clerkOtpLength, clerkOtpPattern } from '../form-constants';

type EmailCodeAuth = ReturnType<typeof useEmailCodeAuth>;

type CodeFormValues = {
  code: string;
};

export function CodeStep({ auth }: { auth: EmailCodeAuth }) {
  const codeForm = useForm({
    defaultValues: {
      code: '',
    } satisfies CodeFormValues,
    onSubmit: async ({ value }) => {
      await auth.verifyCode(value.code);
    },
  });
  const codeServerError =
    auth.error?.field === 'code' ? auth.error.message : null;

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void codeForm.handleSubmit();
      }}
    >
      <codeForm.Field
        name="code"
        validators={{
          onBlur: ({ value }) => validateCode(value),
          onSubmit: ({ value }) => validateCode(value),
        }}
      >
        {(field) => {
          const clientError = getFieldError(field.state.meta.errors);
          const codeError = codeServerError ?? clientError;

          return (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Verification code</Label>
              <InputOTP
                aria-describedby={codeError ? 'code-error' : 'code-hint'}
                aria-invalid={Boolean(codeError)}
                autoComplete="one-time-code"
                disabled={auth.isFetching}
                id={field.name}
                inputMode="numeric"
                maxLength={clerkOtpLength}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(value) =>
                  field.handleChange(
                    value.replace(/\D/g, '').slice(0, clerkOtpLength),
                  )
                }
                pattern={REGEXP_ONLY_DIGITS}
                value={field.state.value}
              >
                <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                  {Array.from({ length: clerkOtpLength }, (_, index) => (
                    <InputOTPSlot
                      aria-invalid={Boolean(codeError)}
                      index={index}
                      key={index}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {codeError ? (
                <p
                  className={textStyles.error}
                  id="code-error"
                  role="alert"
                >
                  {codeError}
                </p>
              ) : (
                <p className={textStyles.meta} id="code-hint">
                  We sent a 6-digit code to {auth.normalizedEmail}. It expires
                  in 10 minutes.
                </p>
              )}
            </div>
          );
        }}
      </codeForm.Field>

      <codeForm.Subscribe
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
                Verifying
              </>
            ) : (
              <>
                Verify code
                <ArrowRight className="size-4" data-icon="inline-end" />
              </>
            )}
          </Button>
        )}
      </codeForm.Subscribe>

      <div className="flex items-center justify-between gap-3 text-sm">
        <Button
          className="h-auto gap-1.5 p-0 text-muted-foreground hover:text-foreground"
          disabled={auth.isFetching}
          onClick={() => void auth.reset()}
          size="sm"
          type="button"
          variant="link"
        >
          Change email
        </Button>
        <Button
          className="h-auto gap-1.5 p-0 text-foreground hover:text-muted-foreground"
          disabled={auth.isFetching}
          onClick={() => void auth.resendCode()}
          size="sm"
          type="button"
          variant="link"
        >
          <RefreshCw className="size-3.5" data-icon="inline-start" />
          Resend code
        </Button>
      </div>
    </form>
  );
}

function validateCode(value: string) {
  if (!value.trim()) {
    return 'Enter the 6-digit code.';
  }

  if (!clerkOtpPattern.test(value)) {
    return 'Enter the 6-digit code from your email.';
  }

  return undefined;
}
