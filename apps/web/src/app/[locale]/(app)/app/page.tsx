import { redirect } from '@/i18n/navigation';
import { routes } from '@/lib/routes';

export default async function AppIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: routes.overview, locale });
}
