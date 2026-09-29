import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SectionRenderer } from '@/components/sections';
import { absoluteUrl } from '@/lib/api';
import { descriptionFor, pageHeading, siteBrand } from '@/lib/brand';
import { getPage, getShell } from '@/lib/site-data';
import { mediaUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const shell = await getShell();
  if (!shell.ok) return {};

  const site = shell.data.site;
  const page = await getPage('contact');
  const brand = siteBrand(site.seo, site.brand_fallback);
  const title = page.ok ? pageHeading(page.data.page, brand) : brand;

  return {
    title,
    description: page.ok ? descriptionFor(site.seo, page.data.page.seo) : descriptionFor(site.seo, undefined),
    alternates: { canonical: await absoluteUrl('/contact') },
    openGraph: { type: 'website', siteName: brand, title },
    twitter: { card: 'summary_large_image' },
    icons: site.favicon_url ? { icon: mediaUrl(site.favicon_url)! } : undefined,
  };
}

export default async function ContactPage() {
  const shell = await getShell();

  if (!shell.ok || !shell.data.site.published) {
    notFound();
  }

  const site = shell.data.site;

  // A template seeds a "contact" page; if the company kept one, draw it.
  const page = await getPage('contact');
  if (page.ok) {
    return (
      <SectionRenderer
        sections={page.data.page.content.sections}
        ctx={{ products: page.data.products, media: site.media, honeypot: site.contact_honeypot }}
      />
    );
  }

  // Otherwise the seed contact section, as the Blade contact view drew it.
  return (
    <SectionRenderer
      sections={[
        {
          id: 'contact-default',
          type: 'contact',
          enabled: true,
          props: { heading: 'Contact us', subheading: '', show_form: true, address: '', phone: '', email: '', hours: '', map_embed_url: '' },
        },
      ]}
      ctx={{ products: [], media: site.media, honeypot: site.contact_honeypot }}
    />
  );
}
