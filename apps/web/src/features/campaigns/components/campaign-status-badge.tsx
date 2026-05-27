import type { CampaignStatus } from '@retaino/shared/contracts';
import {
  StatusBadge,
  type StatusBadgeTone,
} from '@/components/status-badge';

const statusLabels: Record<CampaignStatus, string> = {
  draft: 'Draft',
  failed: 'Failed',
  ready_to_send: 'Ready to send',
  sending: 'Sending',
  sent: 'Sent',
};

const statusTones: Record<CampaignStatus, StatusBadgeTone> = {
  draft: 'gray',
  failed: 'red',
  ready_to_send: 'blue',
  sending: 'amber',
  sent: 'green',
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <StatusBadge label={statusLabels[status]} tone={statusTones[status]} />;
}

export function formatCampaignStatus(status: CampaignStatus) {
  return statusLabels[status];
}
