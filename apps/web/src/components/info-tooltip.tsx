"use client";

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function InfoTooltip({
  children,
  className,
  label = 'More information',
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip onOpenChange={setOpen} open={open}>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          aria-expanded={open}
          className={cn(
            'inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            className,
          )}
          onBlur={() => setOpen(false)}
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
          type="button"
        >
          <Info aria-hidden="true" className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{children}</TooltipContent>
    </Tooltip>
  );
}
