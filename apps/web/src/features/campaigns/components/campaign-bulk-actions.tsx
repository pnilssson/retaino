"use client";

import type { Campaign } from '@retaino/shared/contracts';
import {
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteCampaignDrafts } from '../hooks/use-delete-campaign-draft';

export function CampaignBulkActions({
  campaigns,
  onClear,
  organizationId,
}: {
  campaigns: Campaign[];
  onClear: () => void;
  organizationId: string | null;
}) {
  const t = useTranslations('Campaigns');
  const common = useTranslations('Common');
  const deleteDrafts = useDeleteCampaignDrafts(organizationId);
  const selectedCount = campaigns.length;
  const hasSelection = selectedCount > 0;
  const allDrafts =
    hasSelection && campaigns.every((campaign) => campaign.status === 'draft');
  const disabledReason = hasSelection
    ? t('onlyDraftCampaignsCanBeDeleted')
    : undefined;

  async function deleteSelectedDrafts() {
    if (!allDrafts) {
      return;
    }

    try {
      await deleteDrafts.mutateAsync(campaigns.map((campaign) => campaign.id));
      toast.success(
        selectedCount === 1
          ? t('draftCampaignDeleted')
          : t('draftCampaignsDeleted', { count: selectedCount }),
      );
      onClear();
    } catch (error) {
      toast.error(t('draftCampaignsDeleteErrorTitle'), {
        description:
          error instanceof Error ? error.message : common('tryAgainSoon'),
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('openCampaignActions')}
          disabled={!hasSelection || deleteDrafts.isPending}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <ConfirmDialog
          confirmLabel={t('deleteDrafts')}
          description={
            selectedCount === 1
              ? t('deleteSelectedDraftDescription')
              : t('deleteSelectedDraftsDescription', { count: selectedCount })
          }
          isPending={deleteDrafts.isPending}
          onConfirm={deleteSelectedDrafts}
          title={t('deleteSelectedDraftsTitle')}
          trigger={
            <DropdownMenuItem
              disabled={!allDrafts}
              onSelect={(event) => event.preventDefault()}
              title={!allDrafts ? disabledReason : undefined}
              variant="destructive"
            >
              <Trash2 aria-hidden="true" />
              {t('deleteDrafts')}
            </DropdownMenuItem>
          }
          variant="destructive"
        />
        <DropdownMenuLabel>{t('selectedCount', { count: selectedCount })}</DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
