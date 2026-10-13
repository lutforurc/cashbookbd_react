import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/api';
import { getSitemap } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const res = await getSitemap();

  if (!res.ok) return [];

  const base = await absoluteUrl('');

  return res.data.urls.map((entry) => ({
    url: `${base}${entry.path}`,
    lastModified: entry.lastmod ?? undefined,
    changeFrequency: 'weekly' as const,
  }));
}
