import BuilderClient from '@/components/builder/BuilderClient';

export const dynamic = 'force-dynamic';

export default async function BuilderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <BuilderClient pageId={Number(id)} />;
}
