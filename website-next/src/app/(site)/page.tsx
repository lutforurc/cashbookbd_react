import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SectionRenderer } from '@/components/sections';
import { absoluteUrl } from '@/lib/api';
import { brandOf, mergeSeo } from '@/lib/brand';
import { getHome, getShell } from '@/lib/site-data';
import { mediaUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const shell = await getShell();
  if (!shell.ok) return {};

  const home = await getHome();
  const site = shell.data.site;
  const brand = brandOf(site.seo, home.ok ? home.data.page.seo : undefined, site.brand_fallback);
  const seo = mergeSeo(site.seo, home.ok ? home.data.page.seo : undefined);

  return {
    title: brand,
    description: seo.description || undefined,
    alternates: { canonical: await absoluteUrl('/') },
    openGraph: {
      type: 'website',
      siteName: brand,
      title: brand,
      description: seo.description || undefined,
      images: seo.og_image || site.logo_url ? [seo.og_image ?? mediaUrl(site.logo_url)!] : undefined,
    },
    twitter: { card: 'summary_large_image' },
    icons: site.favicon_url ? { icon: mediaUrl(site.favicon_url)! } : undefined,
  };
}

export default async function HomePage() {
  const shell = await getShell();

  // ⚠️ A public visitor is NEVER sent to /login. '/' belongs to the company
  // website: if no site is served at this host, or nobody has published yet,
  // the visitor gets a public 404 ("not published yet"), not the admin's login.
  // The builder's own routes (/site/*) are the ones that require a session.
  if (!shell.ok || !shell.data.site.published) {
    notFound();
  }

  const home = await getHome();
  if (!home.ok) {
    notFound();
  }

  const site = shell.data.site;

  return (
    <SectionRenderer
      sections={home.data.page.content.sections}
      ctx={{ products: home.data.products, media: site.media, honeypot: site.contact_honeypot }}
    />
  );
}
