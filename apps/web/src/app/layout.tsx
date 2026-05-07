import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Providers } from '@/components/providers';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CookieBanner } from '@/features/cookies/cookie-banner';
import { CookieConsentProvider } from '@/features/cookies/cookie-consent-provider';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Retaino',
  description: 'Reactivate previous customers and measure recovered bookings.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <ClerkProvider taskUrls={{ 'choose-organization': routes.organizationSetup }}>
          <NuqsAdapter>
            <Providers>
              <CookieConsentProvider>
                <TooltipProvider>{children}</TooltipProvider>
                <CookieBanner />
              </CookieConsentProvider>
            </Providers>
          </NuqsAdapter>
        </ClerkProvider>
      </body>
    </html>
  );
}
