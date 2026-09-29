import type { CSSProperties } from 'react';
import SiteLink from '@/components/site/SiteLink';
import type { PublicProduct, Section } from '@/lib/site-types';
import { mediaPathUrl } from '@/lib/url';
import ContactForm from './ContactForm';

/**
 * The section renderer. One component per type, the same set the Blade views
 * had, driven by the same JSON. Unknown or disabled sections render nothing, so
 * a section the server has no component for is invisible rather than broken.
 */

export type SectionContext = {
  products: PublicProduct[];
  media: Record<string, string>;
  honeypot: string;
};

type Props = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const num = (v: unknown, fallback: number): number => (v == null || v === '' || isNaN(Number(v)) ? fallback : Number(v));
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : v == null ? fallback : Boolean(v));

function mediaSrc(ctx: SectionContext, id: unknown): string | null {
  const key = String(id ?? '');
  if (!key || key === 'null' || key === '0') return null;
  const path = ctx.media[key];
  return path ? mediaPathUrl(path) : null;
}

// ------------------------------------------------------------------ sections

function Hero({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const bg = mediaSrc(ctx, props.image);
  const align = str(props.align) || 'center';
  const overlay = Math.min(90, Math.max(0, num(props.overlay, 0))) / 100;
  const primary = (props.primary_button ?? {}) as Props;
  const secondary = (props.secondary_button ?? {}) as Props;

  const style: CSSProperties = bg
    ? { backgroundImage: `linear-gradient(rgba(15,23,42,${overlay}), rgba(15,23,42,${overlay})), url('${bg}')`, color: '#fff' }
    : {};

  return (
    <section className={`hero hero-align-${align}`} style={style}>
      <div className="container">
        {str(props.heading) && <h1 style={bg ? { color: '#fff' } : undefined}>{str(props.heading)}</h1>}
        {str(props.subheading) && (
          <p className="lead" style={bg ? { color: 'rgba(255,255,255,.92)' } : undefined}>{str(props.subheading)}</p>
        )}
        {(str(primary.label) || str(secondary.label)) && (
          <div className="hero-actions">
            {str(primary.label) && <SiteLink className="btn btn-primary" href={str(primary.url) || '#'}>{str(primary.label)}</SiteLink>}
            {str(secondary.label) && (
              <SiteLink className="btn btn-outline" href={str(secondary.url) || '#'} style={bg ? { color: '#fff' } : undefined}>
                {str(secondary.label)}
              </SiteLink>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Text({ props }: { props: Props }) {
  const width = ({ narrow: '720px', normal: '900px', wide: '100%' } as Record<string, string>)[str(props.width) || 'normal'] ?? '900px';
  const align = str(props.align) || 'left';

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: width }}>
        {str(props.heading) && <h2 style={{ textAlign: align as CSSProperties['textAlign'] }}>{str(props.heading)}</h2>}
        {str(props.body) && (
          <div style={{ textAlign: align as CSSProperties['textAlign'], whiteSpace: 'pre-wrap' }}>{str(props.body)}</div>
        )}
      </div>
    </section>
  );
}

function ImageSection({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const src = mediaSrc(ctx, props.image);
  if (!src) return null;
  const align = str(props.align) || 'center';

  return (
    <section className="section">
      <div className="container" style={bool(props.full_width) ? { maxWidth: '100%' } : undefined}>
        <img src={src} alt={str(props.caption)} loading="lazy" style={{ margin: '0 auto', borderRadius: 'var(--site-radius)' }} />
        {str(props.caption) && (
          <p className="muted" style={{ textAlign: align as CSSProperties['textAlign'], marginTop: 12 }}>{str(props.caption)}</p>
        )}
      </div>
    </section>
  );
}

function Gallery({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const items = (Array.isArray(props.items) ? (props.items as Props[]) : []).filter((i) => mediaSrc(ctx, i.image));
  if (items.length === 0) return null;

  return (
    <section className="section">
      <div className="container">
        {str(props.heading) && <div className="section-head"><h2>{str(props.heading)}</h2></div>}
        <div className="grid" style={{ '--cols': num(props.columns, 3) } as CSSProperties}>
          {items.map((item, i) => (
            <figure className="gallery-item" key={i}>
              <img src={mediaSrc(ctx, item.image)!} alt={str(item.caption)} loading="lazy" />
              {str(item.caption) && <figcaption>{str(item.caption)}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features({ props }: { props: Props }) {
  const items = Array.isArray(props.items) ? (props.items as Props[]) : [];

  return (
    <section className="section">
      <div className="container">
        {(str(props.heading) || str(props.subheading)) && (
          <div className="section-head">
            {str(props.heading) && <h2>{str(props.heading)}</h2>}
            {str(props.subheading) && <p className="muted">{str(props.subheading)}</p>}
          </div>
        )}
        <div className="grid" style={{ '--cols': num(props.columns, 3) } as CSSProperties}>
          {items.map((item, i) => (
            <div className="card" key={i}>
              <div className="feature-icon">
                <span className="material-icons" aria-hidden="true">{str(item.icon) || 'star'}</span>
              </div>
              <h3>{str(item.title)}</h3>
              {str(item.text) && <p className="muted">{str(item.text)}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Products({ props, ctx }: { props: Props; ctx: SectionContext }) {
  let list = ctx.products.slice();
  if ((str(props.source) || 'featured') === 'featured') {
    const featured = list.filter((p) => p.is_featured);
    if (featured.length > 0) list = featured;
  }
  list = list.slice(0, num(props.limit, 6));
  const showPrice = bool(props.show_price, true);

  return (
    <section className="section section--tint">
      <div className="container">
        {(str(props.heading) || str(props.subheading)) && (
          <div className="section-head">
            {str(props.heading) && <h2>{str(props.heading)}</h2>}
            {str(props.subheading) && <p className="muted">{str(props.subheading)}</p>}
          </div>
        )}

        {list.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center' }}>No products have been selected for the website yet.</p>
        ) : (
          <div className="grid" style={{ '--cols': num(props.columns, 3) } as CSSProperties}>
            {list.map((product) => (
              <article className="card" key={product.id}>
                {product.image_url && (
                  <SiteLink href={`/products/${product.id}`}>
                    <img src={product.image_url} alt={product.title} loading="lazy" />
                  </SiteLink>
                )}
                <h3><SiteLink href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{product.title}</SiteLink></h3>
                {product.category && <p className="muted" style={{ margin: 0 }}>{product.category}</p>}
                {showPrice && product.price_text !== null && <p className="price">{product.price_text}</p>}
              </article>
            ))}
          </div>
        )}

        {str(props.button_label) && (
          <p style={{ textAlign: 'center', margin: '34px 0 0' }}>
            <SiteLink className="btn btn-primary" href="/products">{str(props.button_label)}</SiteLink>
          </p>
        )}
      </div>
    </section>
  );
}

function Testimonials({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const items = Array.isArray(props.items) ? (props.items as Props[]) : [];

  return (
    <section className="section">
      <div className="container">
        {str(props.heading) && <div className="section-head"><h2>{str(props.heading)}</h2></div>}
        <div className="grid" style={{ '--cols': num(props.columns, 3) } as CSSProperties}>
          {items.map((item, i) => {
            const avatar = mediaSrc(ctx, item.avatar);
            const rating = Math.max(1, Math.min(5, num(item.rating, 5)));
            return (
              <figure className="card" key={i}>
                {avatar && (
                  <img src={avatar} alt={str(item.name)} loading="lazy"
                       style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <blockquote className="quote" style={{ margin: '0 0 12px' }}>{str(item.quote)}</blockquote>
                <div className="stars" aria-label={`${rating} out of 5`}>{'★'.repeat(rating)}</div>
                <figcaption className="muted" style={{ marginTop: 8 }}>
                  <strong>{str(item.name)}</strong>
                  {str(item.role) && <> — {str(item.role)}</>}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Faq({ props }: { props: Props }) {
  const items = Array.isArray(props.items) ? (props.items as Props[]) : [];

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        {(str(props.heading) || str(props.subheading)) && (
          <div className="section-head">
            {str(props.heading) && <h2>{str(props.heading)}</h2>}
            {str(props.subheading) && <p className="muted">{str(props.subheading)}</p>}
          </div>
        )}
        {items.map((item, i) => (
          <details className="faq-item" key={i}>
            <summary>{str(item.question)}</summary>
            {str(item.answer) && <p className="muted" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{str(item.answer)}</p>}
          </details>
        ))}
      </div>
    </section>
  );
}

function Contact({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const showForm = bool(props.show_form, true);

  return (
    <section className="section">
      <div className="container">
        {(str(props.heading) || str(props.subheading)) && (
          <div className="section-head">
            {str(props.heading) && <h2>{str(props.heading)}</h2>}
            {str(props.subheading) && <p className="muted">{str(props.subheading)}</p>}
          </div>
        )}
        <div className="contact-grid">
          <div>
            {str(props.address) && <p><strong>Address</strong><br /><span style={{ whiteSpace: 'pre-wrap' }}>{str(props.address)}</span></p>}
            {str(props.phone) && <p><strong>Phone</strong><br /><a href={`tel:${str(props.phone)}`}>{str(props.phone)}</a></p>}
            {str(props.email) && <p><strong>Email</strong><br /><a href={`mailto:${str(props.email)}`}>{str(props.email)}</a></p>}
            {str(props.hours) && <p><strong>Opening hours</strong><br />{str(props.hours)}</p>}
            {str(props.map_embed_url) && (
              <p><a href={str(props.map_embed_url)} rel="noopener" target="_blank">View on map</a></p>
            )}
          </div>
          {showForm && <div><ContactForm honeypot={ctx.honeypot} /></div>}
        </div>
      </div>
    </section>
  );
}

function Cta({ props }: { props: Props }) {
  const button = (props.button ?? {}) as Props;
  const boxed = (str(props.style) || 'band') === 'boxed';

  if (boxed) {
    return (
      <section className="section">
        <div className="container">
          <div className="cta-boxed">
            {str(props.heading) && <h2>{str(props.heading)}</h2>}
            {str(props.text) && <p className="muted">{str(props.text)}</p>}
            {str(button.label) && <SiteLink className="btn btn-primary" href={str(button.url) || '#'}>{str(button.label)}</SiteLink>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cta-band">
      <div className="container">
        {str(props.heading) && <h2>{str(props.heading)}</h2>}
        {str(props.text) && <p style={{ color: 'rgba(255,255,255,.9)' }}>{str(props.text)}</p>}
        {str(button.label) && (
          <SiteLink className="btn" style={{ background: '#fff', color: 'var(--site-primary)' }} href={str(button.url) || '#'}>
            {str(button.label)}
          </SiteLink>
        )}
      </div>
    </section>
  );
}

function Divider({ props }: { props: Props }) {
  const style = str(props.style) || 'line';

  return (
    <div className="container">
      {style === 'space' ? (
        <div style={{ height: 56 }} />
      ) : style === 'label' ? (
        <div className="divider-label"><span>{str(props.label)}</span></div>
      ) : (
        <hr className="divider-line" />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ renderer

const REGISTRY: Record<string, (p: { props: Props; ctx: SectionContext }) => React.ReactNode> = {
  hero: Hero,
  text: Text,
  image: ImageSection,
  gallery: Gallery,
  features: Features,
  products: Products,
  testimonials: Testimonials,
  faq: Faq,
  contact: Contact,
  cta: Cta,
  divider: Divider,
};

export function SectionRenderer({ sections, ctx }: { sections: Section[]; ctx: SectionContext }) {
  return (
    <>
      {sections.map((section) => {
        if (!section.enabled) return null;
        const Component = REGISTRY[section.type];
        if (!Component) return null;
        return <Component key={section.id} props={(section.props ?? {}) as Props} ctx={ctx} />;
      })}
    </>
  );
}
