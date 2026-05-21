import type {
  OrganizationSmsSender,
  SmsSenderStatus,
} from '@retaino/shared/contracts';

export function isSmsSenderReadyForSending(
  sender: OrganizationSmsSender | null,
): sender is OrganizationSmsSender & { providerMessagingServiceId: string } {
  return Boolean(
    sender?.status === 'ready' && sender.providerMessagingServiceId,
  );
}

export function smsSenderPublicStatus(
  sender: OrganizationSmsSender,
): SmsSenderStatus {
  if (sender.status === 'ready' && !isSmsSenderReadyForSending(sender)) {
    return 'pending';
  }

  return sender.status;
}
