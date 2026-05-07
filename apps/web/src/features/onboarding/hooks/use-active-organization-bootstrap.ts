"use client";

import { useAuth, useOrganizationList, useSession, useUser } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';

export function useActiveOrganizationBootstrap() {
  const {
    isLoaded: isAuthLoaded,
    isSignedIn,
    orgId,
  } = useAuth({ treatPendingAsSignedOut: false });
  const { isLoaded: isSessionLoaded, session } = useSession();
  const { isLoaded: isUserLoaded, user } = useUser();
  const {
    isLoaded: isOrganizationListLoaded,
    setActive,
    userMemberships,
  } = useOrganizationList({
    userMemberships: {
      pageSize: 1,
    },
  });
  const [error, setError] = useState<Error | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const attemptedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isAuthLoaded ||
      !isSessionLoaded ||
      !isUserLoaded ||
      !isOrganizationListLoaded ||
      !isSignedIn ||
      session?.currentTask?.key === 'choose-organization' ||
      orgId ||
      userMemberships.isLoading ||
      !userMemberships.data ||
      isBootstrapping ||
      !setActive ||
      !user
    ) {
      return;
    }

    const memberships = userMemberships.data;
    const activateOrganization = setActive;
    const existingOrganization = memberships[0]?.organization;

    if (!existingOrganization) {
      return;
    }

    const existingOrganizationId = existingOrganization.id;

    if (attemptedUserId.current === user.id) {
      return;
    }

    attemptedUserId.current = user.id;
    let isCancelled = false;

    async function ensureActiveOrganization() {
      setError(null);
      setIsBootstrapping(true);

      try {
        await activateOrganization({ organization: existingOrganizationId });
      } catch (cause) {
        if (!isCancelled) {
          setError(
            cause instanceof Error
              ? cause
              : new Error('Active organization could not be prepared.'),
          );
        }
      } finally {
        if (!isCancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void ensureActiveOrganization();

    return () => {
      isCancelled = true;
    };
  }, [
    isAuthLoaded,
    isBootstrapping,
    isOrganizationListLoaded,
    isSessionLoaded,
    isSignedIn,
    isUserLoaded,
    orgId,
    session?.currentTask?.key,
    setActive,
    user,
    userMemberships.data,
    userMemberships.isLoading,
  ]);

  return {
    error,
    isBootstrapping,
    isLoaded:
      isAuthLoaded &&
      isSessionLoaded &&
      isUserLoaded &&
      isOrganizationListLoaded &&
      !userMemberships.isLoading,
    isReady: !isSignedIn || Boolean(orgId),
    needsOrganization:
      session?.currentTask?.key === 'choose-organization' ||
      (isAuthLoaded &&
        isSignedIn &&
        isOrganizationListLoaded &&
        !userMemberships.isLoading &&
        !orgId &&
        (userMemberships.data?.length ?? 0) === 0),
  };
}
