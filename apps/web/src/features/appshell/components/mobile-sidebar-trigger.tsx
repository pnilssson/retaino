"use client";

import { MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

type MobileSidebarTriggerProps = {
  className?: string;
};

export function MobileSidebarTrigger({
  className
}: MobileSidebarTriggerProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      aria-label="Open navigation"
      className={cn('md:hidden', className)}
      onClick={toggleSidebar}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <MenuIcon aria-hidden="true" strokeWidth={1.5} />
    </Button>
  );
}
