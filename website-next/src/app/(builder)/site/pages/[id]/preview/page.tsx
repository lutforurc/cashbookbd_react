import PreviewClient from '@/components/builder/PreviewClient';

export const dynamic = 'force-dynamic';

export default async function PreviewRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <PreviewClient pageId={Number(id)} />;
}
