import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SectionRenderer } from '@/components/sections';
import SiteLink from '@/components/site/SiteLink';
import { absoluteUrl } from '@/lib/api';
import { descriptionFor, pageHeading, siteBrand } from '@/lib/brand';
import { getPage, getProducts, getShell } from '@/lib/site-data';
import { mediaUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const shell = await getShell();
  if (!shell.ok) return {};

  const site = shell.data.site;
  const page = await getPage('products');
  const brand = siteBrand(site.seo, site.brand_fallback);
  // When the company kept a "products" page, use its title; otherwise the
  // catalogue is just the site itself.
  const title = page.ok ? pageHeading(page.data.page, brand) : brand;

  return {
    title,
    description: page.ok ? descriptionFor(site.seo, page.data.page.seo) : descriptionFor(site.seo, undefined),
    alternates: { canonical: await absoluteUrl('/products') },
    openGraph: { type: 'website', siteName: brand, title },
    twitter: { card: 'summary_large_image' },
    icons: site.favicon_url ? { icon: mediaUrl(site.favicon_url)! } : undefined,
  };
}

export default async function ProductsPage() {
  const shell = await getShell();

  if (!shell.ok || !shell.data.site.published) {
    notFound();
  }

  const site = shell.data.site;

  // A template seeds a "products" page; if the company kept one, draw it as an
  // ordinary page (its products section fetches the grid).
  const page = await getPage('products');
  if (page.ok) {
    return (
      <SectionRenderer
        sections={page.data.page.content.sections}
        ctx={{ products: page.data.products, media: site.media, honeypot: site.contact_honeypot }}
      />
    );
  }

  const products = await getProducts();
  if (!products.ok) {
    notFound();
  }

  const list = products.data.products;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h1>Products</h1>
        </div>

        {list.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center' }}>Products are being added. Please check back soon.</p>
        ) : (
          <div className="grid" style={{ ['--cols' as string]: 3 }}>
            {list.map((product) => (
              <article className="card" key={product.id}>
                {product.image_url && (
                  <SiteLink href={`/products/${product.id}`}>
                    <img src={product.image_url} alt={product.title} loading="lazy" />
                  </SiteLink>
                )}
                <h3><SiteLink href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{product.title}</SiteLink></h3>
                {product.category && <p className="muted" style={{ margin: 0 }}>{product.category}</p>}
                {product.price_text !== null && <p className="price">{product.price_text}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
