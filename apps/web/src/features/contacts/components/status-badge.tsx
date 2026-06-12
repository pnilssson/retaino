import type {
  ContactImportStatus,
  ContactStatus,
} from '@retaino/shared/contracts';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BlockedStatusBadge } from '@/components/blocked-status-badge';
import {
  StatusBadge,
  type StatusBadgeTone,
} from '@/components/status-badge';
const contactStatusMeta: Record<
  ContactStatus,
  { labelKey: 'statusBlocked' | 'statusNeedsData' | 'statusReady'; tone: StatusBadgeTone }
> = {
  blocked: { labelKey: 'statusBlocked', tone: 'red' },
  incomplete: { labelKey: 'statusNeedsData', tone: 'amber' },
  ready: { labelKey: 'statusReady', tone: 'green' },
};

const importStatusTone: Record<ContactImportStatus, StatusBadgeTone> = {
  completed: 'green',
  failed: 'red',
  processing: 'blue',
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  const t = useTranslations('Contacts');
  const meta = contactStatusMeta[status];
  const label = t(meta.labelKey);

  if (status === 'blocked') {
    return <BlockedStatusBadge label={label} />;
  }

  return <StatusBadge label={label} tone={meta.tone} />;
}

export function ImportStatusBadge({
  status,
}: {
  status: ContactImportStatus;
}) {
  const t = useTranslations('Contacts');
  return (
    <StatusBadge
      icon={
        status === 'processing' ? (
          <Loader2 aria-hidden="true" className="size-3 animate-spin" />
        ) : undefined
      }
      label={formatImportStatusLabel(status, t)}
      tone={importStatusTone[status]}
    />
  );
}

function formatImportStatusLabel(
  status: ContactImportStatus,
  t: ReturnType<typeof useTranslations<'Contacts'>>,
) {
  switch (status) {
    case 'completed':
      return t('importStatusCompleted');
    case 'failed':
      return t('importStatusFailed');
    case 'processing':
      return t('importStatusProcessing');
  }
}
