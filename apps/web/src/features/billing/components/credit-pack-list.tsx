"use client";

import {
  CREDIT_PACK_CATALOG,
  CREDIT_PACK_KEYS,
  type CreditPackKey,
} from '@retaino/shared/contracts';
import { CheckCircle2, PlusCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AppPageItem } from '@/features/appshell/components/app-page-content';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { formatCreditCount, formatSek, formatUnitSek } from '../billing-format';

export function CreditPackList({
  canBuyCredits,
  canManageBilling,
  onSelectPack,
  pendingPackKey,
}: {
  canBuyCredits: boolean;
  canManageBilling: boolean;
  onSelectPack: (packKey: CreditPackKey) => void;
  pendingPackKey: CreditPackKey | null;
}) {
  return (
    <section className="grid gap-5">
      <header className="grid gap-1.5">
        <h2 className={textStyles.sectionTitle}>Need more this month?</h2>
        <p className={cn('max-w-3xl', textStyles.mutedBody)}>
          Monthly plan credits reset. Purchased credits roll over and do not
          expire.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {CREDIT_PACK_KEYS.map((packKey) => {
          const pack = CREDIT_PACK_CATALOG[packKey];
          const isPending = pendingPackKey === packKey;

          return (
            <AppPageItem asChild className="content-between" key={packKey}>
              <article aria-labelledby={`credit-pack-${packKey}`}>
                <div className="min-w-0">
                  <h2 className={textStyles.itemTitle} id={`credit-pack-${packKey}`}>
                    {pack.label}
                  </h2>
                  <p className={cn('mt-3', textStyles.numeric)}>
                    {formatSek(pack.priceSek)}
                  </p>
                  <ul className={cn('mt-4 grid gap-2', textStyles.mutedBody)}>
                    <CreditPackFeature>
                      {formatUnitSek(pack.priceSek / pack.smsCredits)} per credit
                    </CreditPackFeature>
                    <CreditPackFeature>
                      Purchased credits roll over
                    </CreditPackFeature>
                    <CreditPackFeature>Purchased credits do not expire</CreditPackFeature>
                  </ul>
                </div>
                <Button
                  className="w-full"
                  disabled={
                    !canManageBilling || !canBuyCredits || Boolean(pendingPackKey)
                  }
                  onClick={() => onSelectPack(packKey)}
                  type="button"
                  variant="outline"
                >
                  <PlusCircle aria-hidden="true" data-icon="inline-start" />
                  {packActionLabel({
                    canBuyCredits,
                    isPending,
                    smsCredits: pack.smsCredits,
                  })}
                </Button>
              </article>
            </AppPageItem>
          );
        })}
      </div>
    </section>
  );
}

function packActionLabel({
  canBuyCredits,
  isPending,
  smsCredits,
}: {
  canBuyCredits: boolean;
  isPending: boolean;
  smsCredits: number;
}) {
  if (isPending) {
    return 'Opening checkout';
  }

  if (!canBuyCredits) {
    return 'Activate a plan first';
  }

  return `Add ${formatCreditCount(smsCredits)} credits`;
}

function CreditPackFeature({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-foreground"
      />
      <span>{children}</span>
    </li>
  );
}
