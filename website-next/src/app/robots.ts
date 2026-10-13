import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/api';
import { getShell } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const shell = await getShell();

  // Nothing published -> keep crawlers off, as the Blade robots() 404 did.
  if (!shell.ok || !shell.data.site.published) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: await absoluteUrl('/sitemap.xml'),
  };
}
