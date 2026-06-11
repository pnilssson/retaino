import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}${routes.overview}`);
}
