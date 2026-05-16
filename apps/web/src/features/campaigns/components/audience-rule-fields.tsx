"use client";

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { textStyles } from '@/lib/text-styles';

const lapsedDayPresets = [30, 60, 90, 180] as const;

function isPresetLapsedDays(value: number) {
  return lapsedDayPresets.some((preset) => preset === value);
}

export function AudienceRuleFields({
  includeNoBookingDate,
  lapsedDays,
  onIncludeNoBookingDateChange,
  onLapsedDaysChange,
}: {
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
        <Label>Time since last booking</Label>
        <div className="flex flex-wrap gap-2">
          {lapsedDayPresets.map((days) => (
            <Button
              aria-pressed={!showCustomInput && lapsedDays === days}
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
          <Label htmlFor="campaign-lapsed-days">Days since last booking</Label>
          <Input
            id="campaign-lapsed-days"
            max={365}
            min={30}
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

      <label className="flex max-w-2xl items-start gap-3">
        <Checkbox
          checked={includeNoBookingDate}
          className="mt-1"
          onCheckedChange={(value) =>
            onIncludeNoBookingDateChange(value === true)
          }
        />
        <span className="grid gap-1">
          <span className={textStyles.itemTitle}>
            Include contacts without a booking date
          </span>
          <span className={textStyles.mutedBody}>
            Use this only when the import did not contain booking history but
            the contacts are still valid marketing recipients.
          </span>
        </span>
      </label>
    </div>
  );
}
