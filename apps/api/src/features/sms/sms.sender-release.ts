import {
  clearOrganizationSmsSenderReleaseSchedule,
  getOrganizationBillingProfile,
  getOrganizationSmsSender,
  markOrganizationSmsSenderReleaseFailed,
  markOrganizationSmsSenderReleased,
  scheduleOrganizationSmsSenderRelease,
} from '@retaino/db';
import { hasCurrentBillingSubscription } from '@retaino/shared/contracts';
import { createSmsProvider } from '../../lib/sms-provider';
import type { AppEnv } from '../../types';

type DbClient = AppEnv['Variables']['db'];

export type SmsSenderReleaseResult =
  | { status: 'not_found' }
  | { status: 'not_due' }
  | { status: 'subscription_restored' }
  | { status: 'released' };

export async function processSmsSenderRelease(input: {
  db: DbClient;
  env: AppEnv['Bindings'];
  organizationId: string;
}): Promise<SmsSenderReleaseResult> {
  const provider = createSmsProvider(input.env);
  const sender = await getOrganizationSmsSender(input.db, {
    organizationId: input.organizationId,
    provider: provider.name,
  });

  if (!sender || sender.status === 'released') {
    return { status: 'not_found' };
  }

  if (
    !sender.releaseScheduledAt ||
    new Date(sender.releaseScheduledAt).getTime() > Date.now()
  ) {
    return { status: 'not_due' };
  }

  const billing = await getOrganizationBillingProfile(
    input.db,
    input.organizationId,
  );

  if (hasCurrentBillingSubscription(billing?.subscriptionStatus)) {
    if (!billing?.cancelAtPeriodEnd) {
      await clearOrganizationSmsSenderReleaseSchedule(input.db, {
        organizationId: input.organizationId,
        provider: provider.name,
      });
      return { status: 'subscription_restored' };
    }

    if (
      billing.currentPeriodEnd &&
      billing.currentPeriodEnd.getTime() > Date.now()
    ) {
      await scheduleOrganizationSmsSenderRelease(input.db, {
        organizationId: input.organizationId,
        provider: provider.name,
        status: 'ready',
        releaseScheduledAt: billing.currentPeriodEnd,
      });
      return { status: 'not_due' };
    }
  }

  await scheduleOrganizationSmsSenderRelease(input.db, {
    organizationId: input.organizationId,
    provider: provider.name,
    status: 'release_pending',
    releaseScheduledAt: new Date(),
  });

  try {
    await provider.releaseSender({
      providerMessagingServiceId: sender.providerMessagingServiceId,
      providerPhoneNumberId: sender.providerPhoneNumberId,
    });
  } catch (error) {
    await markOrganizationSmsSenderReleaseFailed(input.db, {
      id: sender.id,
      failureReason:
        'Sender release needs support review. Retaino has been notified.',
    });
    throw error;
  }

  await markOrganizationSmsSenderReleased(input.db, {
    id: sender.id,
    releasedAt: new Date(),
  });

  return { status: 'released' };
}
