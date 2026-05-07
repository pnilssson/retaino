import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { HeroSection } from '@/features/marketing/components/hero-section';
import { routes } from '@/lib/routes';

export default async function HomePage() {
  const { isAuthenticated } = await auth({
    treatPendingAsSignedOut: false
  });

  if (isAuthenticated) {
    redirect(routes.app);
  }

  return (
    <main id="main-content" className="flex-1">
      <HeroSection />
    </main>
  );
}
