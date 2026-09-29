import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SectionRenderer } from '@/components/sections';
import { absoluteUrl } from '@/lib/api';
import { brandOf, mergeSeo, pageTitle as composePageTitle } from '@/lib/brand';
import { getPage, getShell } from '@/lib/site-data';
import { mediaUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [shell, page] = await Promise.all([getShell(), getPage(slug)]);

  if (!shell.ok || !page.ok) return {};

  const site = shell.data.site;
  const brand = brandOf(site.seo, page.data.page.seo, site.brand_fallback);
  const title = composePageTitle(false, page.data.page.title, brand);
  const seo = mergeSeo(site.seo, page.data.page.seo);

  return {
    title,
    description: seo.description || undefined,
    alternates: { canonical: await absoluteUrl(`/${slug}`) },
    openGraph: {
      type: 'website',
      siteName: brand,
      title,
      description: seo.description || undefined,
      images: seo.og_image || site.logo_url ? [seo.og_image ?? mediaUrl(site.logo_url)!] : undefined,
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function SitePage({ params }: Params) {
  const { slug } = await params;
  const page = await getPage(slug);

  if (!page.ok) {
    notFound();
  }

  const shell = await getShell();
  const site = shell.ok ? shell.data.site : null;

  return (
    <SectionRenderer
      sections={page.data.page.content.sections}
      ctx={{
        products: page.data.products,
        media: site?.media ?? {},
        honeypot: site?.contact_honeypot ?? 'company_website_url',
      }}
    />
  );
}
