"use client";

import type { Campaign } from '@retaino/shared/contracts';
import {
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
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

export function CampaignDraftActions({
  campaign,
  organizationId,
}: {
  campaign: Campaign;
  organizationId: string | null;
}) {
  const router = useRouter();
  const deleteDraft = useDeleteCampaignDraft(organizationId);

  async function handleDeleteDraft() {
    try {
      await deleteDraft.mutateAsync(campaign.id);
      toast.success('Draft campaign deleted');
      router.push(routes.campaigns);
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
          aria-label="Open draft actions"
          disabled={deleteDraft.isPending}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
