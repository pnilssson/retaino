import type { CampaignStatus } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import {
  StatusBadge,
  type StatusBadgeTone,
} from '@/components/status-badge';

const statusTones: Record<CampaignStatus, StatusBadgeTone> = {
  draft: 'gray',
  failed: 'red',
  ready_to_send: 'blue',
  sending: 'amber',
  sent: 'green',
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const t = useTranslations('Campaigns');

  return <StatusBadge label={formatCampaignStatus(status, t)} tone={statusTones[status]} />;
}

export function formatCampaignStatus(
  status: CampaignStatus,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
) {
  switch (status) {
    case 'draft':
      return t('statusDraft');
    case 'failed':
      return t('statusFailed');
    case 'ready_to_send':
      return t('statusReadyToSend');
    case 'sending':
      return t('statusSending');
    case 'sent':
      return t('statusSent');
  }
}
