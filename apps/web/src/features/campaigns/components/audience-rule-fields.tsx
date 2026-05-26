"use client";

import { useState } from 'react';
import {
  RECENT_CAMPAIGN_EXCLUSION_DAYS,
  type Campaign,
  type CampaignAudienceRule,
} from '@retaino/shared/contracts';
import { Check, ChevronsUpDown } from 'lucide-react';
import { InfoTooltip } from '@/components/info-tooltip';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

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
  disabled = false,
  includeNoBookingDate,
  lapsedDays,
  onIncludeNoBookingDateChange,
  onLapsedDaysChange,
}: {
  disabled?: boolean;
  includeNoBookingDate: boolean;
  lapsedDays: number;
  onIncludeNoBookingDateChange: (value: boolean) => void;
  onLapsedDaysChange: (value: number) => void;
}) {
  const lapsedDaysIsPreset = isPresetLapsedDays(lapsedDays);
  const [customSelected, setCustomSelected] = useState(false);
  const showCustomInput = customSelected || !lapsedDaysIsPreset;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex items-center gap-1.5">
          <Label>Days since last booking</Label>
          <InfoTooltip label="Days since last booking details">
            Retaino includes contacts whose last booking was at least this many
            days ago.
          </InfoTooltip>
        </div>
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
    </div>
  );
}

export function AudienceExclusionFields({
  campaigns,
  disabled = false,
  excludeCampaignIds,
  onExcludeCampaignIdsChange,
  onRecentCampaignExclusionDaysChange,
  recentCampaignExclusionDays,
}: {
  campaigns: Campaign[];
  disabled?: boolean;
  excludeCampaignIds: string[];
  onExcludeCampaignIdsChange: (value: string[]) => void;
  onRecentCampaignExclusionDaysChange: (
    value: CampaignAudienceRule['recentCampaignExclusionDays'],
  ) => void;
  recentCampaignExclusionDays: CampaignAudienceRule['recentCampaignExclusionDays'];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const lastSentCampaign = campaigns
    .filter((campaign) => campaign.sentAt)
    .sort((first, second) =>
      String(second.sentAt).localeCompare(String(first.sentAt)),
    )[0];
  const selectedCampaigns = excludeCampaignIds
    .map((id) => campaigns.find((campaign) => campaign.id === id))
    .filter((campaign): campaign is Campaign => Boolean(campaign));
  const selectedCampaignLabel = selectedCampaigns
    .map((campaign) => campaign.name)
    .join(', ');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCampaigns = normalizedQuery
    ? campaigns.filter((campaign) =>
        [campaign.name, campaign.sentAt ?? ''].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        ),
      )
    : campaigns;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="campaign-contact-window">
            Skip contacts messaged within
          </Label>
          <InfoTooltip label="Campaign duplicate window details">
            Retaino avoids sending another campaign to people contacted during
            this period.
          </InfoTooltip>
        </div>
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
          <SelectTrigger className="w-full sm:w-56" id="campaign-contact-window">
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
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="excluded-campaigns">Exclude sent campaigns</Label>
            <InfoTooltip label="Excluded sent campaigns details">
              Contacts messaged in selected campaigns are skipped for this send.
            </InfoTooltip>
          </div>
          {lastSentCampaign ? (
            <Button
              disabled={disabled}
              onClick={() => onExcludeCampaignIdsChange([lastSentCampaign.id])}
              size="sm"
              type="button"
              variant="outline"
            >
              Select latest sent
            </Button>
          ) : null}
        </div>

        {campaigns.length === 0 ? (
          <p className={textStyles.meta}>
            Sent campaigns will appear here after the first campaign has
            message history.
          </p>
        ) : (
          <Popover
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);

              if (!nextOpen) {
                setQuery('');
              }
            }}
            open={open}
          >
            <PopoverTrigger asChild>
              <Button
                aria-expanded={open}
                className="h-auto min-h-9 w-full justify-between gap-3 px-3 py-2"
                disabled={disabled}
                id="excluded-campaigns"
                role="combobox"
                type="button"
                variant="outline"
              >
                <span
                  className={cn(
                    'min-w-0 truncate',
                    selectedCampaigns.length === 0 && 'text-muted-foreground',
                  )}
                >
                  {selectedCampaigns.length === 0
                    ? 'Choose campaigns to exclude'
                    : selectedCampaignLabel}
                </span>
                <ChevronsUpDown aria-hidden="true" data-icon="inline-end" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-2">
              <Input
                aria-label="Search sent campaigns"
                autoComplete="off"
                className="mb-2"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search campaigns"
                value={query}
              />
              <div
                aria-multiselectable="true"
                className="max-h-64 overflow-y-auto"
                role="listbox"
              >
                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((campaign) => {
                    const selected = excludeCampaignIds.includes(campaign.id);

                    return (
                      <button
                        aria-selected={selected}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                          selected && 'bg-accent/60',
                        )}
                        key={campaign.id}
                        onClick={() => {
                          onExcludeCampaignIdsChange(
                            selected
                              ? excludeCampaignIds.filter(
                                  (id) => id !== campaign.id,
                                )
                              : [...excludeCampaignIds, campaign.id],
                          );
                        }}
                        role="option"
                        type="button"
                      >
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate', textStyles.itemTitle)}>
                            {campaign.name}
                          </span>
                          <span className={cn('block truncate', textStyles.meta)}>
                            {campaign.sentAt
                              ? `Sent ${formatCampaignDate(campaign.sentAt)}`
                              : 'Send history available'}
                          </span>
                        </span>
                        <Check
                          aria-hidden="true"
                          className={cn(
                            'shrink-0',
                            selected ? 'opacity-100' : 'opacity-0',
                          )}
                          data-icon="inline-end"
                        />
                      </button>
                    );
                  })
                ) : (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No campaigns found.
                  </p>
                )}
              </div>
              {selectedCampaigns.length > 0 ? (
                <div className="mt-2 flex items-center justify-between gap-2 px-2 pt-2">
                  <p className={textStyles.meta}>
                    {selectedCampaigns.length}{' '}
                    {selectedCampaigns.length === 1
                      ? 'campaign selected'
                      : 'campaigns selected'}
                  </p>
                  <Button
                    disabled={disabled}
                    onClick={() => onExcludeCampaignIdsChange([])}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

function formatCampaignDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
}
