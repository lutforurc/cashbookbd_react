import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteLink from '@/components/site/SiteLink';
import { absoluteUrl } from '@/lib/api';
import { brandOf } from '@/lib/brand';
import { getProduct, getShell } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const [shell, product] = await Promise.all([getShell(), getProduct(Number(id))]);

  if (!shell.ok || !product.ok) return {};

  const site = shell.data.site;
  const brand = brandOf(site.seo, undefined, site.brand_fallback);
  const title = `${product.data.product.title} — ${brand}`;

  return {
    title,
    description: product.data.product.description || undefined,
    alternates: { canonical: await absoluteUrl(`/products/${id}`) },
    openGraph: { type: 'website', siteName: brand, title },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function ProductPage({ params }: Params) {
  const { id } = await params;
  const product = await getProduct(Number(id));

  if (!product.ok) {
    notFound();
  }

  const item = product.data.product;

  return (
    <section className="section">
      <div className="container product-detail">
        <div>
          {item.image_url && <img src={item.image_url} alt={item.title} />}
        </div>
        <div>
          <h1>{item.title}</h1>
          {item.category && <p className="muted">{item.category}</p>}
          {item.price_text !== null && <p className="price" style={{ fontSize: '1.4rem' }}>{item.price_text}</p>}
          {item.description && <p>{item.description}</p>}
          <p><SiteLink className="btn btn-primary" href="/contact">Enquire about this product</SiteLink></p>
          <p><SiteLink href="/products">&larr; All products</SiteLink></p>
        </div>
      </div>
    </section>
  );
}
