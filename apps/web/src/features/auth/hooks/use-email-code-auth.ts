'use client';

import {
  useAuth,
  useSignIn,
  useSignUp,
} from '@clerk/nextjs';
import { useRouter } from '@/i18n/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  getAuthError,
  hasClerkErrorCode,
} from '@/features/auth/auth-errors';
import type {
  AuthError,
  AuthStep,
} from '@/features/auth/types';
import { routes } from '@/lib/routes';

type NavigateParams = {
  decorateUrl: (url: string) => string;
};

const signUpTransferCode = 'sign_up_if_missing_transfer';

export function useEmailCodeAuth() {
  const router = useRouter();
  const { isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const {
    signIn,
    fetchStatus: signInFetchStatus
  } = useSignIn();
  const {
    signUp,
    fetchStatus: signUpFetchStatus
  } = useSignUp();
  const signInRef = useRef(signIn);
  const signUpRef = useRef(signUp);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [step, setStep] = useState<AuthStep>('email');
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    signInRef.current = signIn;
    signUpRef.current = signUp;
  }, [signIn, signUp]);

  useEffect(() => {
    if (isSignedIn) {
      router.replace(routes.app);
    }
  }, [isSignedIn, router]);

  const isFetching =
    !signIn ||
    !signUp ||
    signInFetchStatus === 'fetching' ||
    signUpFetchStatus === 'fetching';

  const normalizedEmail = useMemo(
    () => submittedEmail.trim().toLowerCase(),
    [submittedEmail]
  );

  const navigateAfterAuth = useCallback(
    ({ decorateUrl }: NavigateParams) => {
      const destination = decorateUrl(routes.app);

      if (destination.startsWith('http')) {
        window.location.href = destination;
        return;
      }

      router.push(destination);
    },
    [router]
  );

  const finalizeSignIn = useCallback(async () => {
    const currentSignIn = signInRef.current;

    if (!currentSignIn) {
      return;
    }

    const { error: finalizeError } = await currentSignIn.finalize({
      navigate: navigateAfterAuth
    });

    if (finalizeError) {
      setError(getAuthError(finalizeError, 'form'));
    }
  }, [navigateAfterAuth]);

  const finalizeSignUp = useCallback(async () => {
    const currentSignUp = signUpRef.current;

    if (!currentSignUp) {
      return;
    }

    const { error: finalizeError } = await currentSignUp.finalize({
      navigate: navigateAfterAuth
    });

    if (finalizeError) {
      setError(getAuthError(finalizeError, 'form'));
    }
  }, [navigateAfterAuth]);

  const completeTransfer = useCallback(async () => {
    const currentSignUp = signUpRef.current;

    if (!currentSignUp) {
      return;
    }

    const { error: transferError } = await currentSignUp.create({
      transfer: true,
      legalAccepted: true
    });

    if (transferError) {
      setError(getAuthError(transferError, 'form'));
      return;
    }

    if (currentSignUp.status === 'complete') {
      await finalizeSignUp();
      return;
    }

    if (
      currentSignUp.status === 'missing_requirements' &&
      currentSignUp.missingFields.includes('legal_accepted')
    ) {
      const { error: updateError } = await currentSignUp.update({
        legalAccepted: true
      });

      if (updateError) {
        setError(getAuthError(updateError, 'requirements'));
        setStep('requirements');
        return;
      }

      if ((currentSignUp.status as string) === 'complete') {
        await finalizeSignUp();
        return;
      }
    }

    setStep('requirements');
    setError({
      field: 'requirements',
      message:
        'This account needs more information before it can be created. Check the Clerk sign-up settings for required fields.'
    });
  }, [finalizeSignUp]);

  const submitEmail = useCallback(
    async (email: string) => {
      setError(null);

      if (isSignedIn) {
        router.replace(routes.app);
        return;
      }

      const currentSignIn = signInRef.current;

      if (!currentSignIn) {
        setError({
          field: 'email',
          message: 'Authentication is still loading. Try again in a moment.'
        });
        return;
      }

      const normalizedSubmittedEmail = email.trim().toLowerCase();
      setSubmittedEmail(normalizedSubmittedEmail);

      const { error: createError } = await currentSignIn.create({
        identifier: normalizedSubmittedEmail,
        signUpIfMissing: true
      });

      if (createError) {
        setError(getAuthError(createError, 'email'));
        return;
      }

      const { error: sendError } = await currentSignIn.emailCode.sendCode();

      if (sendError) {
        setError(getAuthError(sendError, 'email'));
        return;
      }

      setStep('code');
    },
    [isSignedIn, router]
  );

  const verifyCode = useCallback(
    async (code: string) => {
      setError(null);

      if (isSignedIn) {
        router.replace(routes.app);
        return;
      }

      const currentSignIn = signInRef.current;

      if (!currentSignIn) {
        setError({
          field: 'code',
          message: 'Authentication is still loading. Try again in a moment.'
        });
        return;
      }

      const { error: verifyError } = await currentSignIn.emailCode.verifyCode({
        code: code.trim()
      });

      if (verifyError) {
        if (hasClerkErrorCode(verifyError, signUpTransferCode)) {
          await completeTransfer();
          return;
        }

        setError(getAuthError(verifyError, 'code'));
        return;
      }

      if (currentSignIn.status === 'complete') {
        await finalizeSignIn();
        return;
      }

      setError({
        field: 'form',
        message:
          'This sign-in needs another verification step before it can continue.'
      });
    },
    [completeTransfer, finalizeSignIn, isSignedIn, router]
  );

  const resendCode = useCallback(async () => {
    setError(null);

    const currentSignIn = signInRef.current;

    if (!currentSignIn) {
      return;
    }

    const { error: sendError } = await currentSignIn.emailCode.sendCode();

    if (sendError) {
      setError(getAuthError(sendError, 'code'));
    }
  }, []);

  const reset = useCallback(async () => {
    const currentSignIn = signInRef.current;
    const currentSignUp = signUpRef.current;

    await Promise.all([currentSignIn?.reset(), currentSignUp?.reset()]);
    setStep('email');
    setSubmittedEmail('');
    setError(null);
  }, []);

  return {
    error,
    isFetching,
    normalizedEmail,
    resendCode,
    reset,
    step,
    submitEmail,
    verifyCode
  };
}
