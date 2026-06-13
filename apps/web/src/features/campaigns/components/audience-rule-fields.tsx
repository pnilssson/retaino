"use client";

import { useState } from 'react';
import { useId } from 'react';
import {
  RECENT_CAMPAIGN_EXCLUSION_DAYS,
  type Campaign,
  type CampaignAudienceRule,
} from '@retaino/shared/contracts';
import {
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
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
import { getIntlLocale } from '@/lib/locale-format';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

const lapsedDayPresets = [30, 60, 90, 180] as const;
const recentCampaignOptionValues = [
  ...[...RECENT_CAMPAIGN_EXCLUSION_DAYS]
    .sort((first, second) => second - first)
    .map(String),
  'off',
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
  const t = useTranslations('Campaigns');
  const includeNoBookingDateId = useId();
  const lapsedDaysIsPreset = isPresetLapsedDays(lapsedDays);
  const [customSelected, setCustomSelected] = useState(false);
  const showCustomInput = customSelected || !lapsedDaysIsPreset;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex items-center gap-1.5">
          <Label>{t('daysSinceLastBooking')}</Label>
          <InfoTooltip label={t('daysSinceLastBookingDetails')}>
            {t('daysSinceLastBookingDescription')}
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
              {t('daysOption', { days })}
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
            {t('custom')}
          </Button>
        </div>
      </div>

      {showCustomInput ? (
        <div className="grid max-w-48 gap-2">
          <Input
            aria-label={t('customDaysSinceLastBooking')}
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
            {t('lapsedDaysRangeDescription')}
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Checkbox
          checked={includeNoBookingDate}
          disabled={disabled}
          id={includeNoBookingDateId}
          onCheckedChange={(value) =>
            onIncludeNoBookingDateChange(value === true)
          }
        />
        <Label
          className={textStyles.itemTitle}
          htmlFor={includeNoBookingDateId}
        >
          {t('includeContactsWithoutBookingDate')}
        </Label>
      </div>
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
  const locale = useLocale();
  const t = useTranslations('Campaigns');
  const excludedCampaignsListboxId = `${useId()}-excluded-campaigns`;
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
            {t('skipContactsMessagedWithin')}
          </Label>
          <InfoTooltip label={t('campaignDuplicateWindowDetails')}>
            {t('campaignDuplicateWindowDescription')}
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
            {recentCampaignOptionValues.map((value) => (
              <SelectItem key={value} value={value}>
                {value === 'off'
                  ? t('off')
                  : t('daysOption', { days: Number(value) })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="excluded-campaigns">
              {t('excludeSentCampaigns')}
            </Label>
            <InfoTooltip label={t('excludedSentCampaignsDetails')}>
              {t('excludedSentCampaignsDescription')}
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
              {t('selectLatestSent')}
            </Button>
          ) : null}
        </div>

        {campaigns.length === 0 ? (
          <p className={textStyles.meta}>
            {t('sentCampaignsWillAppear')}
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
                aria-controls={open ? excludedCampaignsListboxId : undefined}
                aria-expanded={open}
                aria-haspopup="listbox"
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
                    ? t('chooseCampaignsToExclude')
                    : selectedCampaignLabel}
                </span>
                <ChevronsUpDown aria-hidden="true" data-icon="inline-end" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-2">
              <Input
                aria-label={t('searchSentCampaigns')}
                autoComplete="off"
                className="mb-2"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchCampaigns')}
                value={query}
              />
              <div
                aria-multiselectable="true"
                aria-labelledby="excluded-campaigns"
                className="max-h-64 overflow-y-auto"
                id={excludedCampaignsListboxId}
                role="listbox"
              >
                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((campaign) => {
                    const selected = excludeCampaignIds.includes(campaign.id);

                    return (
                      <button
                        aria-selected={selected}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                          textStyles.body,
                          selected && 'bg-accent/60',
                        )}
                        key={campaign.id}
                        id={`${excludedCampaignsListboxId}-${campaign.id}`}
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
                              ? t('sentOn', {
                                  date: formatCampaignDate(campaign.sentAt, locale),
                                })
                              : t('sendHistoryAvailable')}
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
                  <p className={cn('px-2 py-3', textStyles.mutedBody)} role="status">
                    {t('noCampaignsFound')}
                  </p>
                )}
              </div>
              {selectedCampaigns.length > 0 ? (
                <div className="mt-2 flex items-center justify-between gap-2 px-2 pt-2">
                  <p className={textStyles.meta}>
                    {t(
                      selectedCampaigns.length === 1
                        ? 'campaignSelected'
                        : 'campaignsSelected',
                      { count: selectedCampaigns.length },
                    )}
                  </p>
                  <Button
                    disabled={disabled}
                    onClick={() => onExcludeCampaignIdsChange([])}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {t('clear')}
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

function formatCampaignDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
  }).format(new Date(value));
}
