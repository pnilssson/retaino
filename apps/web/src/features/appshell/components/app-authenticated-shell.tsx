"use client";

import type { ReactNode } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { OnboardingGate } from '@/features/onboarding/components/onboarding-gate';
import { AppBreadcrumb } from './app-breadcrumb';
import { AppSidebar } from './app-sidebar';
import { MobileSidebarTrigger } from './mobile-sidebar-trigger';

export function AppAuthenticatedShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="main-content">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          <AppBreadcrumb />
          <MobileSidebarTrigger className="ml-auto" />
        </header>
        <OnboardingGate>
          <div className="flex flex-1 flex-col">{children}</div>
        </OnboardingGate>
      </SidebarInset>
    </SidebarProvider>
  );
}
