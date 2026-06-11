import { ContactDetailScreen } from '@/features/contacts/components/contact-detail-screen';

type ContactDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const { id } = await params;

  return <ContactDetailScreen contactId={id} />;
}
