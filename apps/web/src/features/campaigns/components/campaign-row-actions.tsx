"use client";

import type { Campaign } from '@retaino/shared/contracts';
import {
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { routes } from '@/lib/routes';
import { useDeleteCampaignDraft } from '../hooks/use-delete-campaign-draft';

export function CampaignRowActions({
  campaign,
  organizationId,
}: {
  campaign: Campaign;
  organizationId: string | null;
}) {
  const deleteDraft = useDeleteCampaignDraft(organizationId);
  const isDraft = campaign.status === 'draft';

  async function handleDeleteDraft() {
    try {
      await deleteDraft.mutateAsync(campaign.id);
      toast.success('Draft campaign deleted');
    } catch (error) {
      toast.error('Draft campaign could not be deleted', {
        description:
          error instanceof Error ? error.message : 'Try again in a moment.',
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for ${campaign.name}`}
          disabled={deleteDraft.isPending}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={routes.campaign(campaign.id)}>
            <Pencil aria-hidden="true" />
            Open campaign
          </Link>
        </DropdownMenuItem>
        {isDraft ? (
          <ConfirmDialog
            confirmLabel="Delete draft"
            description={`This permanently deletes ${campaign.name}.`}
            isPending={deleteDraft.isPending}
            onConfirm={handleDeleteDraft}
            title="Delete draft campaign?"
            trigger={
              <DropdownMenuItem
                onSelect={(event) => event.preventDefault()}
                variant="destructive"
              >
                <Trash2 aria-hidden="true" />
                Delete draft
              </DropdownMenuItem>
            }
            variant="destructive"
          />
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
