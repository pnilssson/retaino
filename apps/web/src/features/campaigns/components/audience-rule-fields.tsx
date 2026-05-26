"use client";

import { useState } from 'react';
import {
  RECENT_CAMPAIGN_EXCLUSION_DAYS,
  type Campaign,
  type CampaignAudienceRule,
} from '@retaino/shared/contracts';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { textStyles } from '@/lib/text-styles';

const lapsedDayPresets = [30, 60, 90, 180] as const;
const recentCampaignOptions = [
  ...[...RECENT_CAMPAIGN_EXCLUSION_DAYS]
    .sort((first, second) => second - first)
    .map((days) => ({
      label: `${days} days`,
      value: String(days),
    })),
  { label: 'Off', value: 'off' },
] as const;

function isPresetLapsedDays(value: number) {
  return lapsedDayPresets.some((preset) => preset === value);
}

export function AudienceRuleFields({
  campaigns,
  disabled = false,
  excludeCampaignIds,
  includeNoBookingDate,
  lapsedDays,
  onExcludeCampaignIdsChange,
  onIncludeNoBookingDateChange,
  onLapsedDaysChange,
  onRecentCampaignExclusionDaysChange,
  recentCampaignExclusionDays,
}: {
  campaigns: Campaign[];
  disabled?: boolean;
  excludeCampaignIds: string[];
  includeNoBookingDate: boolean;
  lapsedDays: number;
  onExcludeCampaignIdsChange: (value: string[]) => void;
  onIncludeNoBookingDateChange: (value: boolean) => void;
  onLapsedDaysChange: (value: number) => void;
  onRecentCampaignExclusionDaysChange: (
    value: CampaignAudienceRule['recentCampaignExclusionDays'],
  ) => void;
  recentCampaignExclusionDays: CampaignAudienceRule['recentCampaignExclusionDays'];
}) {
  const lapsedDaysIsPreset = isPresetLapsedDays(lapsedDays);
  const [customSelected, setCustomSelected] = useState(false);
  const showCustomInput = customSelected || !lapsedDaysIsPreset;
  const lastSentCampaign = campaigns
    .filter((campaign) => campaign.sentAt)
    .sort((first, second) =>
      String(second.sentAt).localeCompare(String(first.sentAt)),
    )[0];

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Days since last booking</Label>
        <div className="flex flex-wrap gap-2">
          {lapsedDayPresets.map((days) => (
            <Button
              aria-pressed={!showCustomInput && lapsedDays === days}
              disabled={disabled}
              key={days}
              onClick={() => {
                setCustomSelected(false);
                onLapsedDaysChange(days);
              }}
              size="sm"
              type="button"
              variant={
                !showCustomInput && lapsedDays === days ? 'default' : 'outline'
              }
            >
              {days} days
            </Button>
          ))}
          <Button
            aria-pressed={showCustomInput}
            disabled={disabled}
            onClick={() => setCustomSelected(true)}
            size="sm"
            type="button"
            variant={showCustomInput ? 'default' : 'outline'}
          >
            Custom
          </Button>
        </div>
      </div>

      {showCustomInput ? (
        <div className="grid max-w-48 gap-2">
          <Input
            aria-label="Custom days since last booking"
            autoComplete="off"
            disabled={disabled}
            id="campaign-lapsed-days"
            inputMode="numeric"
            max={365}
            min={30}
            name="campaign-lapsed-days"
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              onLapsedDaysChange(
                nextValue === '' ? Number.NaN : Number(nextValue),
              );
            }}
            type="number"
            value={Number.isFinite(lapsedDays) ? lapsedDays : ''}
          />
          <p className={textStyles.meta}>
            Retaino includes contacts whose last booking was at least this many
            days ago. Allowed range is 30 to 365 days.
          </p>
        </div>
      ) : null}

      <label className="flex items-center gap-3">
        <Checkbox
          checked={includeNoBookingDate}
          disabled={disabled}
          onCheckedChange={(value) =>
            onIncludeNoBookingDateChange(value === true)
          }
        />
        <span className={textStyles.itemTitle}>
          Include contacts without booking date
        </span>
      </label>

      <div className="grid gap-4 border-t pt-4">
        <div className="grid gap-2">
          <Label htmlFor="recent-campaign-exclusion">
            Recent campaign protection
          </Label>
          <Select
            disabled={disabled}
            onValueChange={(value) =>
              onRecentCampaignExclusionDaysChange(
                value === 'off'
                  ? null
                  : (Number(value) as CampaignAudienceRule['recentCampaignExclusionDays']),
              )
            }
            value={
              recentCampaignExclusionDays === null
                ? 'off'
                : String(recentCampaignExclusionDays)
            }
          >
            <SelectTrigger className="w-full sm:w-48" id="recent-campaign-exclusion">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {recentCampaignOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className={textStyles.meta}>
            Retaino avoids sending another campaign to people contacted during
            this period.
          </p>
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Exclude previous campaigns</Label>
            {lastSentCampaign ? (
              <Button
                disabled={disabled}
                onClick={() => onExcludeCampaignIdsChange([lastSentCampaign.id])}
                size="sm"
                type="button"
                variant="outline"
              >
                Select last sent campaign
              </Button>
            ) : null}
          </div>

          {campaigns.length === 0 ? (
            <p className={textStyles.meta}>
              Sent campaigns will appear here after the first campaign has
              message history.
            </p>
          ) : (
            <div className="grid max-h-56 gap-1 overflow-y-auto rounded-md border p-2">
              {campaigns.map((campaign) => {
                const checked = excludeCampaignIds.includes(campaign.id);

                return (
                  <label
                    className="flex items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted/60"
                    key={campaign.id}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(value) => {
                        const nextChecked = value === true;

                        onExcludeCampaignIdsChange(
                          nextChecked
                            ? [...excludeCampaignIds, campaign.id]
                            : excludeCampaignIds.filter((id) => id !== campaign.id),
                        );
                      }}
                    />
                    <span className="grid min-w-0 gap-0.5">
                      <span className={textStyles.itemTitle}>
                        {campaign.name}
                      </span>
                      <span className={textStyles.meta}>
                        {campaign.sentAt
                          ? `Sent ${formatCampaignDate(campaign.sentAt)}`
                          : 'Send history available'}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCampaignDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
}
