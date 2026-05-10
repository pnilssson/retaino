import { ContactImportDetailScreen } from '@/features/contacts/components/import-panel';

type ContactImportDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ContactImportDetailPage({
  params,
}: ContactImportDetailPageProps) {
  const { id } = await params;

  return <ContactImportDetailScreen importId={id} />;
}
