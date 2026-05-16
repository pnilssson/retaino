import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieBanner } from "@/features/cookies/cookie-banner";
import { CookieConsentProvider } from "@/features/cookies/cookie-consent-provider";
import { routes } from "@/lib/routes";
import "./globals.css";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Retaino",
  description: "Reactivate previous customers and measure recovered bookings.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
        <ClerkProvider
          taskUrls={{ "choose-organization": routes.organizationSetup }}
        >
          <NuqsAdapter>
            <Providers>
              <CookieConsentProvider>
                <TooltipProvider>{children}</TooltipProvider>
                <Toaster />
                <CookieBanner />
              </CookieConsentProvider>
            </Providers>
          </NuqsAdapter>
        </ClerkProvider>
      </body>
    </html>
  );
}
