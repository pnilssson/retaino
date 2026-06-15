import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import {
  getLocale,
  getTranslations,
} from 'next-intl/server';
import {
  Geist,
  JetBrains_Mono,
} from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsentProvider } from "@/features/cookies/cookie-consent-provider";
import { routes } from "@/lib/routes";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  const title = t("title");
  const description = t("description");

  return {
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
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html className={`${fontSans.variable} ${fontMono.variable}`} lang={locale}>
      <body className="antialiased">
        <ClerkProvider
          taskUrls={{ "choose-organization": routes.organizationSetup }}
        >
          <NuqsAdapter>
            <Providers>
              <CookieConsentProvider>
                <TooltipProvider>{children}</TooltipProvider>
                <Toaster />
              </CookieConsentProvider>
            </Providers>
          </NuqsAdapter>
        </ClerkProvider>
      </body>
    </html>
  );
}
