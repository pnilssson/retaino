import { auth } from '@clerk/nextjs/server';
import { redirect } from '@/i18n/navigation';
import { HeroSection } from '@/features/marketing/components/hero-section';
import { routes } from '@/lib/routes';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { isAuthenticated } = await auth({
    treatPendingAsSignedOut: false
  });

  if (isAuthenticated) {
    redirect({ href: routes.app, locale });
  }

  return (
    <main id="main-content" className="flex-1">
      <HeroSection />
    </main>
  );
}
