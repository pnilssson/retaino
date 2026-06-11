'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';

import { useCookieConsent } from './hooks/use-cookie-consent';

function Toggle({
  checked,
  disabled,
  id,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  id: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input',
      ].join(' ')}
      disabled={disabled}
      id={id}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={[
          'pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

export function CookiePreferencesDialog() {
  const { consent, isPreferencesOpen, setIsPreferencesOpen } =
    useCookieConsent();

  return (
    <Dialog open={isPreferencesOpen} onOpenChange={setIsPreferencesOpen}>
      {isPreferencesOpen ? (
        <CookiePreferencesForm initialAnalytics={consent?.analytics ?? false} />
      ) : null}
    </Dialog>
  );
}

function CookiePreferencesForm({
  initialAnalytics,
}: {
  initialAnalytics: boolean;
}) {
  const { updateConsent, setIsPreferencesOpen } = useCookieConsent();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(initialAnalytics);

  function handleSave() {
    updateConsent({ analytics: analyticsEnabled });
    setIsPreferencesOpen(false);
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Cookie preferences</DialogTitle>
        <DialogDescription>
          Choose whether Retaino may use optional analytics. Essential cookies
          and browser storage keep sign-in, preferences, security, and this
          choice working.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-1">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <label className={textStyles.body}>Essential</label>
            <p className={textStyles.meta}>
              Required for authentication, app preferences, security, and your
              cookie choice.
            </p>
          </div>
          <Toggle
            checked={true}
            disabled={true}
            id="essential-cookies"
            onCheckedChange={() => {}}
          />
        </div>

        <div className="border-t" />

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <label
              className={textStyles.body}
              htmlFor="analytics-cookies"
            >
              Analytics
            </label>
            <p className={textStyles.meta}>
              Retaino does not set optional analytics cookies right now. This
              setting keeps analytics off unless you allow it.
            </p>
          </div>
          <Toggle
            checked={analyticsEnabled}
            id="analytics-cookies"
            onCheckedChange={setAnalyticsEnabled}
          />
        </div>
      </div>

      <p className={textStyles.meta}>
        Read the{' '}
        <Link
          className="text-foreground underline underline-offset-2"
          href={routes.cookies}
        >
          Cookie Policy
        </Link>
        .
      </p>

      <DialogFooter>
        <Button
          onClick={() => setIsPreferencesOpen(false)}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button onClick={handleSave} type="button">
          Save preferences
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
