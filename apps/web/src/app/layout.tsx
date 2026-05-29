import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import {
  Geist,
  JetBrains_Mono,
} from "next/font/google";
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

const title = "Retaino";
const description =
  "Keep the clients you already paid to acquire and turn existing relationships into booked appointments.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://retaino.io";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "Retaino",
  openGraph: {
    title,
    description,
    siteName: "Retaino",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
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
