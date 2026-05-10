"use client";

import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { OnboardingGate } from '@/features/onboarding/components/onboarding-gate';
import { AppBreadcrumb } from './app-breadcrumb';
import { AppSidebar } from './app-sidebar';

export function AppAuthenticatedShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="main-content">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex min-w-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              className="mr-2 data-vertical:h-4 data-vertical:self-center"
              orientation="vertical"
            />
            <AppBreadcrumb />
          </div>
        </header>
        <OnboardingGate>
          <div className="flex flex-1 flex-col">{children}</div>
        </OnboardingGate>
      </SidebarInset>
    </SidebarProvider>
  );
}
