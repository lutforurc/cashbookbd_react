import TemplatePreviewClient from '@/components/builder/TemplatePreviewClient';

export const dynamic = 'force-dynamic';

export default async function TemplatePreviewRoute({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  return <TemplatePreviewClient templateKey={key} />;
}
