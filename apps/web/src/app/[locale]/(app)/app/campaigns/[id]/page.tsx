import { CampaignBuilderScreen } from '@/features/campaigns/components/campaign-builder-screen';

type CampaignBuilderPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignBuilderPage({ params }: CampaignBuilderPageProps) {
  const { id } = await params;

  return <CampaignBuilderScreen campaignId={id} />;
}
