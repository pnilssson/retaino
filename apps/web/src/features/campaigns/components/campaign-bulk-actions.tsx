"use client";

import type { Campaign } from '@retaino/shared/contracts';
import {
  MoreVertical,
  Trash2,
} from 'lucide-react';
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
  const deleteDrafts = useDeleteCampaignDrafts(organizationId);
  const selectedCount = campaigns.length;
  const hasSelection = selectedCount > 0;
  const allDrafts =
    hasSelection && campaigns.every((campaign) => campaign.status === 'draft');
  const disabledReason = hasSelection
    ? 'Only draft campaigns can be deleted'
    : undefined;

  async function deleteSelectedDrafts() {
    if (!allDrafts) {
      return;
    }

    try {
      await deleteDrafts.mutateAsync(campaigns.map((campaign) => campaign.id));
      toast.success(
        selectedCount === 1
          ? 'Draft campaign deleted'
          : `${selectedCount} draft campaigns deleted`,
      );
      onClear();
    } catch (error) {
      toast.error('Draft campaigns could not be deleted', {
        description:
          error instanceof Error ? error.message : 'Try again in a moment.',
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open campaign actions"
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
          confirmLabel="Delete drafts"
          description={
            selectedCount === 1
              ? 'This permanently deletes the selected draft campaign.'
              : `This permanently deletes ${selectedCount} selected draft campaigns.`
          }
          isPending={deleteDrafts.isPending}
          onConfirm={deleteSelectedDrafts}
          title="Delete selected drafts?"
          trigger={
            <DropdownMenuItem
              disabled={!allDrafts}
              onSelect={(event) => event.preventDefault()}
              title={!allDrafts ? disabledReason : undefined}
              variant="destructive"
            >
              <Trash2 aria-hidden="true" />
              Delete drafts
            </DropdownMenuItem>
          }
          variant="destructive"
        />
        <DropdownMenuLabel>{selectedCount} selected</DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
