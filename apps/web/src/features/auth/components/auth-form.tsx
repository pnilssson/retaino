"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useEmailCodeAuth } from "@/features/auth/hooks/use-email-code-auth";
import { getFieldError } from "@/lib/form-errors";
import { routes } from "@/lib/routes";
import { REGEXP_ONLY_DIGITS } from "input-otp";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clerkOtpLength = 6;
const clerkOtpPattern = /^\d{6}$/;

type EmailFormValues = {
  email: string;
};

type CodeFormValues = {
  code: string;
};

export function AuthForm() {
  const auth = useEmailCodeAuth();

  const emailForm = useForm({
    defaultValues: {
      email: "",
    } satisfies EmailFormValues,
    onSubmit: async ({ value }) => {
      await auth.submitEmail(value.email);
    },
  });

  const codeForm = useForm({
    defaultValues: {
      code: "",
    } satisfies CodeFormValues,
    onSubmit: async ({ value }) => {
      await auth.verifyCode(value.code);
    },
  });

  const emailServerError =
    auth.error?.field === "email" ? auth.error.message : null;
  const codeServerError =
    auth.error?.field === "code" ? auth.error.message : null;
  const formError =
    auth.error && auth.error.field !== "email" && auth.error.field !== "code"
      ? auth.error.message
      : null;

  return (
    <section className="mx-auto flex min-h-svh w-full max-w-[420px] flex-col px-5 py-8 sm:px-8">
      <div className="flex items-center lg:hidden">
        <span className="text-sm tracking-tight">retaino.</span>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <p className="text-sm text-muted-foreground">Secure workspace access</p>
        <h1 className="mt-3 max-w-sm text-2xl leading-snug text-foreground">
          Sign in with your work email.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We will send a one-time code.
        </p>

        <div className="mt-9">
          {auth.step === "requirements" ? (
            <div className="grid gap-5">
              <div
                className="border border-destructive/25 bg-destructive/5 p-4 text-sm leading-6 text-destructive"
                role="alert"
              >
                {formError ??
                  "This account needs more information before it can be created."}
              </div>
              <Button
                className="h-12 px-4"
                disabled={auth.isFetching}
                onClick={() => void auth.reset()}
                size="lg"
                type="button"
                variant="outline"
              >
                Use a different email
              </Button>
            </div>
          ) : auth.step === "email" ? (
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
                  onChange: ({ value }) => {
                    const normalizedEmail = value.trim().toLowerCase();

                    if (!normalizedEmail) {
                      return "Enter your email address.";
                    }

                    if (!emailPattern.test(normalizedEmail)) {
                      return "Enter a full email address, for example name@example.com.";
                    }

                    return undefined;
                  },
                }}
              >
                {(field) => {
                  const clientError = getFieldError(field.state.meta.errors);
                  const emailError =
                    emailServerError ??
                    (field.state.meta.isBlurred ? clientError : null);
                  const emailHint = emailPattern.test(
                    field.state.value.trim().toLowerCase(),
                  )
                    ? "We will send a secure code."
                    : null;

                  return (
                    <div className="grid gap-2">
                      <Label htmlFor={field.name}>Email</Label>
                      <Input
                        aria-describedby={
                          emailError
                            ? "email-error"
                            : emailHint
                              ? "email-hint"
                              : undefined
                        }
                        aria-invalid={Boolean(emailError)}
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        className="h-12 text-base"
                        disabled={auth.isFetching}
                        id={field.name}
                        inputMode="email"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="name@example.com"
                        type="email"
                        value={field.state.value}
                      />
                      {emailError ? (
                        <p
                          className="text-sm leading-5 text-destructive"
                          id="email-error"
                          role="alert"
                        >
                          {emailError}
                        </p>
                      ) : emailHint ? (
                        <p
                          className="text-xs leading-5 text-muted-foreground"
                          id="email-hint"
                        >
                          {emailHint}
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
                        <Loader2 className="size-4 animate-spin" />
                        Sending code
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                )}
              </emailForm.Subscribe>
            </form>
          ) : (
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
                  onChange: ({ value }) => {
                    if (!value.trim()) {
                      return "Enter the 6-digit code.";
                    }

                    if (!clerkOtpPattern.test(value)) {
                      return "Enter the 6-digit code from your email.";
                    }

                    return undefined;
                  },
                }}
              >
                {(field) => {
                  const clientError = getFieldError(field.state.meta.errors);
                  const codeError = codeServerError ?? clientError;

                  return (
                    <div className="grid gap-2">
                      <Label htmlFor={field.name}>Verification code</Label>
                      <InputOTP
                        aria-describedby={
                          codeError ? "code-error" : "code-hint"
                        }
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
                            value
                              .replace(/\D/g, "")
                              .slice(0, clerkOtpLength),
                          )
                        }
                        pattern={REGEXP_ONLY_DIGITS}
                        value={field.state.value}
                      >
                        <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                          <InputOTPSlot
                            aria-invalid={Boolean(codeError)}
                            index={0}
                          />
                          <InputOTPSlot
                            aria-invalid={Boolean(codeError)}
                            index={1}
                          />
                          <InputOTPSlot
                            aria-invalid={Boolean(codeError)}
                            index={2}
                          />
                          <InputOTPSlot
                            aria-invalid={Boolean(codeError)}
                            index={3}
                          />
                          <InputOTPSlot
                            aria-invalid={Boolean(codeError)}
                            index={4}
                          />
                          <InputOTPSlot
                            aria-invalid={Boolean(codeError)}
                            index={5}
                          />
                        </InputOTPGroup>
                      </InputOTP>
                      {codeError ? (
                        <p
                          className="text-sm leading-5 text-destructive"
                          id="code-error"
                          role="alert"
                        >
                          {codeError}
                        </p>
                      ) : (
                        <p
                          className="text-xs leading-5 text-muted-foreground"
                          id="code-hint"
                        >
                          We sent a 6-digit code to {auth.normalizedEmail}. It
                          expires in 10 minutes.
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
                        <Loader2 className="size-4 animate-spin" />
                        Verifying
                      </>
                    ) : (
                      <>
                        Verify code
                        <ArrowRight className="size-4" />
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
                  <RefreshCw className="size-3.5" />
                  Resend code
                </Button>
              </div>
            </form>
          )}

          {formError && auth.step !== "requirements" ? (
            <p
              className="mt-5 border border-destructive/25 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div id="clerk-captcha" />
        </div>
      </div>

      <p className="text-center text-xs leading-5 text-muted-foreground">
        By continuing, you agree to Retaino&apos;s{" "}
        <Link
          className="text-foreground underline underline-offset-2"
          href={routes.terms}
        >
          terms and conditions
        </Link>{" "}
        and{" "}
        <Link
          className="text-foreground underline underline-offset-2"
          href={routes.privacy}
        >
          privacy policy
        </Link>
        .
      </p>
    </section>
  );
}
