import type {
  ContactImportStatus,
  ContactStatus,
} from '@retaino/shared/contracts';
import {
  StatusBadge,
  type StatusBadgeTone,
} from '@/components/status-badge';
import { formatImportStatus } from '../contacts-format';

const contactStatusMeta: Record<
  ContactStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  blocked: { label: 'Blocked', tone: 'red' },
  incomplete: { label: 'Needs data', tone: 'amber' },
  ready: { label: 'Ready', tone: 'green' },
};

const importStatusTone: Record<ContactImportStatus, StatusBadgeTone> = {
  completed: 'green',
  failed: 'red',
  processing: 'blue',
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  const meta = contactStatusMeta[status];

  return <StatusBadge label={meta.label} tone={meta.tone} />;
}

export function ImportStatusBadge({
  status,
}: {
  status: ContactImportStatus;
}) {
  return (
    <StatusBadge
      label={formatImportStatus(status)}
      tone={importStatusTone[status]}
    />
  );
}
