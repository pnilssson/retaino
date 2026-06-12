"use client";

import type { Campaign } from '@retaino/shared/contracts';
import {
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Campaigns');
  const common = useTranslations('Common');
  const deleteDraft = useDeleteCampaignDraft(organizationId);
  const isDraft = campaign.status === 'draft';

  async function handleDeleteDraft() {
    try {
      await deleteDraft.mutateAsync(campaign.id);
      toast.success(t('draftCampaignDeleted'));
    } catch (error) {
      toast.error(t('draftCampaignDeleteErrorTitle'), {
        description:
          error instanceof Error ? error.message : common('tryAgainSoon'),
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('openActionsForCampaign', { name: campaign.name })}
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
            {t('openCampaign')}
          </Link>
        </DropdownMenuItem>
        {isDraft ? (
          <ConfirmDialog
            confirmLabel={t('deleteDraft')}
            description={t('deleteDraftDescription', { name: campaign.name })}
            isPending={deleteDraft.isPending}
            onConfirm={handleDeleteDraft}
            title={t('deleteDraftTitle')}
            trigger={
              <DropdownMenuItem
                onSelect={(event) => event.preventDefault()}
                variant="destructive"
              >
                <Trash2 aria-hidden="true" />
                {t('deleteDraft')}
              </DropdownMenuItem>
            }
            variant="destructive"
          />
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
