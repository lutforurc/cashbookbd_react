import type { TemplatePage, TemplateSection } from './websiteTemplateSlice';

/**
 * The master-template preview: desktop / tablet / mobile.
 *
 * The company website is rendered by the Next.js app from the same section
 * JSON, so this is a faithful shape preview rather than a second renderer with
 * its own markup -- the stylesheet below mirrors the published site's classes,
 * and `theme_css` is the server's own SiteTheme output, injected verbatim, so
 * colours, fonts and spacing are exactly what a company would get.
 */
const SITE_CSS = `
.wt-root *, .wt-root *::before, .wt-root *::after { box-sizing: border-box; }
.wt-root { font-family: var(--site-body-font, system-ui, sans-serif); color: var(--site-text, #1f2937); background: var(--site-bg, #fff); line-height: 1.55; }
.wt-root h1, .wt-root h2, .wt-root h3 { font-family: var(--site-heading-font, system-ui, sans-serif); color: var(--site-secondary, #0f172a); margin: 0 0 .4em; line-height: 1.2; }
.wt-root h1 { font-size: 2.1rem; } .wt-root h2 { font-size: 1.5rem; } .wt-root h3 { font-size: 1.05rem; }
.wt-root p { margin: 0 0 1em; } .wt-root a { color: var(--site-primary, #2563eb); }
.wt-root img { max-width: 100%; display: block; }
.wt-container { width: 100%; max-width: var(--site-container, 1080px); margin: 0 auto; padding: 0 18px; }
.wt-section { padding: 44px 0; }
.wt-tint { background: color-mix(in srgb, var(--site-primary, #2563eb) 6%, var(--site-bg, #fff)); }
.wt-head { max-width: 720px; margin: 0 auto 26px; text-align: center; }
.wt-muted { color: color-mix(in srgb, var(--site-text, #1f2937) 68%, #fff); }
.wt-grid { display: grid; gap: 20px; grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr)); }
.wt-card { background: var(--site-bg, #fff); border: 1px solid color-mix(in srgb, var(--site-text, #1f2937) 12%, #fff); border-radius: var(--site-radius, 10px); padding: 18px; }
.wt-btn { display: inline-block; padding: 9px 18px; border-radius: var(--site-radius, 10px); font-weight: 600; text-decoration: none; border: 2px solid transparent; }
.wt-btn-primary { background: var(--site-primary, #2563eb); color: #fff; }
.wt-btn-outline { border-color: currentColor; color: var(--site-primary, #2563eb); }
.btnstyle-pill .wt-btn { border-radius: 999px; }
.wt-hero { padding: 64px 0; background-size: cover; background-position: center; }
.wt-hero-center { text-align: center; } .wt-hero-right { text-align: right; }
.wt-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.wt-hero-center .wt-hero-actions { justify-content: center; }
.wt-header { display: flex; align-items: center; gap: 16px; min-height: 58px; border-bottom: 1px solid color-mix(in srgb, var(--site-text, #1f2937) 12%, #fff); padding: 0 18px; }
.wt-header-dark { background: var(--site-secondary, #0f172a); color: #fff; }
.wt-header-dark a { color: #fff; }
.wt-brand { font-weight: 700; text-decoration: none; margin-right: auto; }
.wt-nav { display: flex; gap: 16px; }
.wt-nav a { text-decoration: none; }
.wt-cta-band { background: var(--site-primary, #2563eb); color: #fff; padding: 40px 0; text-align: center; }
.wt-cta-band h2 { color: #fff; }
.wt-cta-boxed { background: color-mix(in srgb, var(--site-primary, #2563eb) 8%, var(--site-bg, #fff)); border-radius: var(--site-radius, 10px); padding: 28px; text-align: center; }
.wt-divider-line { border: 0; border-top: 1px solid color-mix(in srgb, var(--site-text, #1f2937) 15%, #fff); margin: 28px 0; }
.wt-divider-label { display: flex; align-items: center; gap: 12px; margin: 28px 0; }
.wt-divider-label::before, .wt-divider-label::after { content: ''; flex: 1; border-top: 1px solid color-mix(in srgb, var(--site-text, #1f2937) 15%, #fff); }
.wt-faq { border-bottom: 1px solid color-mix(in srgb, var(--site-text, #1f2937) 12%, #fff); padding: 12px 0; }
.wt-faq summary { cursor: pointer; font-weight: 600; }
.wt-gallery { margin: 0; border-radius: var(--site-radius, 10px); overflow: hidden; border: 1px solid color-mix(in srgb, var(--site-text, #1f2937) 12%, #fff); }
.wt-star { color: var(--site-accent, #f59e0b); letter-spacing: 2px; }
.wt-price { font-weight: 700; color: var(--site-secondary, #0f172a); }
.wt-footer { background: var(--site-secondary, #0f172a); color: #fff; padding: 32px 0 18px; }
.wt-footer a { color: #fff; opacity: .85; text-decoration: none; }
.wt-missing { border: 1px dashed #94a3b8; border-radius: 8px; padding: 14px; color: #64748b; font-size: .85rem; }
@media (max-width: 700px) { .wt-grid { grid-template-columns: 1fr; } }
`;

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

function Section({ section }: { section: TemplateSection }) {
  const p = (section.props ?? {}) as Record<string, unknown>;

  switch (section.type) {
    case 'hero': {
      const bg = str(p.image);
      const align = str(p.align) || 'center';
      const overlay = Math.min(90, Math.max(0, Number(p.overlay ?? 0))) / 100;
      const primary = (p.primary_button ?? {}) as Record<string, unknown>;
      const secondary = (p.secondary_button ?? {}) as Record<string, unknown>;
      return (
        <section
          className={`wt-hero wt-hero-${align}`}
          style={bg ? { backgroundImage: `linear-gradient(rgba(15,23,42,${overlay}), rgba(15,23,42,${overlay})), url('${bg}')`, color: '#fff' } : undefined}
        >
          <div className="wt-container">
            {str(p.heading) && <h1 style={bg ? { color: '#fff' } : undefined}>{str(p.heading)}</h1>}
            {str(p.subheading) && <p style={bg ? { color: 'rgba(255,255,255,.92)' } : undefined}>{str(p.subheading)}</p>}
            {(str(primary.label) || str(secondary.label)) && (
              <div className="wt-hero-actions">
                {str(primary.label) && <a className="wt-btn wt-btn-primary" href="#">{str(primary.label)}</a>}
                {str(secondary.label) && <a className="wt-btn wt-btn-outline" href="#" style={bg ? { color: '#fff' } : undefined}>{str(secondary.label)}</a>}
              </div>
            )}
          </div>
        </section>
      );
    }

    case 'text':
      return (
        <section className="wt-section">
          <div className="wt-container" style={{ maxWidth: ({ narrow: 720, normal: 900, wide: '100%' } as Record<string, number | string>)[str(p.width) || 'normal'] }}>
            {str(p.heading) && <h2 style={{ textAlign: (str(p.align) || 'left') as any }}>{str(p.heading)}</h2>}
            {str(p.body) && <div style={{ whiteSpace: 'pre-wrap' }}>{str(p.body)}</div>}
          </div>
        </section>
      );

    case 'image':
      if (!str(p.image)) return <div className="wt-container"><div className="wt-missing">Image section — no image chosen</div></div>;
      return (
        <section className="wt-section">
          <div className="wt-container">
            <img src={str(p.image)} alt={str(p.caption)} />
            {str(p.caption) && <p className="wt-muted">{str(p.caption)}</p>}
          </div>
        </section>
      );

    case 'gallery': {
      const items = (Array.isArray(p.items) ? p.items : []) as Record<string, unknown>[];
      if (!items.length) return <div className="wt-container"><div className="wt-missing">Gallery — no pictures yet</div></div>;
      return (
        <section className="wt-section">
          <div className="wt-container">
            {str(p.heading) && <div className="wt-head"><h2>{str(p.heading)}</h2></div>}
            <div className="wt-grid" style={{ ['--cols' as any]: Number(p.columns ?? 3) }}>
              {items.map((item, i) => (
                <figure className="wt-gallery" key={i}>
                  <img src={str(item.image)} alt={str(item.caption)} />
                  {str(item.caption) && <figcaption style={{ padding: '8px 12px' }}>{str(item.caption)}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case 'features': {
      const items = (Array.isArray(p.items) ? p.items : []) as Record<string, unknown>[];
      return (
        <section className="wt-section">
          <div className="wt-container">
            {(str(p.heading) || str(p.subheading)) && (
              <div className="wt-head">
                {str(p.heading) && <h2>{str(p.heading)}</h2>}
                {str(p.subheading) && <p className="wt-muted">{str(p.subheading)}</p>}
              </div>
            )}
            <div className="wt-grid" style={{ ['--cols' as any]: Number(p.columns ?? 3) }}>
              {items.map((item, i) => (
                <div className="wt-card" key={i}>
                  <h3>{str(item.title)}</h3>
                  {str(item.text) && <p className="wt-muted">{str(item.text)}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case 'products':
      return (
        <section className="wt-section wt-tint">
          <div className="wt-container">
            <div className="wt-head"><h2>{str(p.heading) || 'Products'}</h2></div>
            <div className="wt-missing">Product grid — filled from each company's own selected products when they use this template.</div>
          </div>
        </section>
      );

    case 'testimonials': {
      const items = (Array.isArray(p.items) ? p.items : []) as Record<string, unknown>[];
      return (
        <section className="wt-section">
          <div className="wt-container">
            {str(p.heading) && <div className="wt-head"><h2>{str(p.heading)}</h2></div>}
            <div className="wt-grid" style={{ ['--cols' as any]: Number(p.columns ?? 3) }}>
              {items.map((item, i) => (
                <figure className="wt-card" key={i}>
                  <blockquote style={{ margin: '0 0 10px', fontStyle: 'italic' }}>{str(item.quote)}</blockquote>
                  <div className="wt-star">{'★'.repeat(Math.max(1, Math.min(5, Number(item.rating ?? 5))))}</div>
                  <figcaption className="wt-muted" style={{ marginTop: 6 }}><strong>{str(item.name)}</strong>{str(item.role) ? ` — ${str(item.role)}` : ''}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case 'faq': {
      const items = (Array.isArray(p.items) ? p.items : []) as Record<string, unknown>[];
      return (
        <section className="wt-section">
          <div className="wt-container" style={{ maxWidth: 820 }}>
            {str(p.heading) && <div className="wt-head"><h2>{str(p.heading)}</h2></div>}
            {items.map((item, i) => (
              <details className="wt-faq" key={i}>
                <summary>{str(item.question)}</summary>
                {str(item.answer) && <p className="wt-muted" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{str(item.answer)}</p>}
              </details>
            ))}
          </div>
        </section>
      );
    }

    case 'contact':
      return (
        <section className="wt-section">
          <div className="wt-container">
            {(str(p.heading) || str(p.subheading)) && (
              <div className="wt-head">
                {str(p.heading) && <h2>{str(p.heading)}</h2>}
                {str(p.subheading) && <p className="wt-muted">{str(p.subheading)}</p>}
              </div>
            )}
            <div className="wt-grid" style={{ ['--cols' as any]: 2 }}>
              <div>
                {str(p.address) && <p><strong>Address</strong><br />{str(p.address)}</p>}
                {str(p.phone) && <p><strong>Phone</strong><br />{str(p.phone)}</p>}
                {str(p.email) && <p><strong>Email</strong><br />{str(p.email)}</p>}
                {str(p.hours) && <p><strong>Opening hours</strong><br />{str(p.hours)}</p>}
              </div>
              <div>{p.show_form !== false && <div className="wt-missing">Message form — visitors fill this on the live site.</div>}</div>
            </div>
          </div>
        </section>
      );

    case 'cta': {
      const button = (p.button ?? {}) as Record<string, unknown>;
      if ((str(p.style) || 'band') === 'boxed') {
        return (
          <section className="wt-section">
            <div className="wt-container">
              <div className="wt-cta-boxed">
                {str(p.heading) && <h2>{str(p.heading)}</h2>}
                {str(p.text) && <p className="wt-muted">{str(p.text)}</p>}
                {str(button.label) && <a className="wt-btn wt-btn-primary" href="#">{str(button.label)}</a>}
              </div>
            </div>
          </section>
        );
      }
      return (
        <section className="wt-cta-band">
          <div className="wt-container">
            {str(p.heading) && <h2>{str(p.heading)}</h2>}
            {str(p.text) && <p style={{ color: 'rgba(255,255,255,.9)' }}>{str(p.text)}</p>}
            {str(button.label) && <a className="wt-btn" style={{ background: '#fff', color: 'var(--site-primary)' }} href="#">{str(button.label)}</a>}
          </div>
        </section>
      );
    }

    case 'divider': {
      const style = str(p.style) || 'line';
      return (
        <div className="wt-container">
          {style === 'space' ? <div style={{ height: 40 }} /> : style === 'label'
            ? <div className="wt-divider-label"><span>{str(p.label)}</span></div>
            : <hr className="wt-divider-line" />}
        </div>
      );
    }

    default:
      return null;
  }
}

export const TemplatePreviewPane = ({
  page,
  theme,
  themeCss,
  device,
}: {
  page: TemplatePage | null;
  theme: Record<string, unknown>;
  themeCss: string;
  device: 'desktop' | 'tablet' | 'mobile';
}) => {
  const width = { desktop: '100%', tablet: '820px', mobile: '390px' }[device];
  const brand = String(theme?.name ?? 'Preview');
  const nav = Array.isArray(theme?.nav) ? (theme.nav as { label: string }[]) : [];
  const headerStyle = String(theme?.header_style ?? 'light');

  return (
    <div className="rounded-sm border border-[rgb(var(--c-border))] bg-slate-200 p-3 dark:bg-slate-800">
      <style>{SITE_CSS}</style>
      {/* The server's own SiteTheme::css() output -- the same bytes the live
          site is given, so the preview is not an approximation of the theme. */}
      <style>{themeCss}</style>

      <div style={{ width, margin: '0 auto', transition: 'width .2s', background: 'var(--site-bg, #fff)' }}>
        <div className={`wt-root btnstyle-${String(theme?.button_style ?? 'solid')}`}>
          <div className={`wt-header ${headerStyle === 'dark' ? 'wt-header-dark' : ''}`}>
            <a className="wt-brand" href="#">{brand}</a>
            <nav className="wt-nav">{nav.map((n, i) => <a href="#" key={i}>{n.label}</a>)}</nav>
          </div>

          {page ? (
            <>
              {page.sections.filter((s) => s.enabled).map((s) => <Section section={s} key={s.id} />)}
              {page.sections.filter((s) => s.enabled).length === 0 && (
                <div className="wt-container" style={{ padding: '40px 18px' }}>
                  <div className="wt-missing">This page has no sections yet. Add one on the left.</div>
                </div>
              )}
            </>
          ) : (
            <div className="wt-container" style={{ padding: '40px 18px' }}><div className="wt-missing">No page selected.</div></div>
          )}

          <div className="wt-footer">
            <div className="wt-container"><strong>{brand}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewPane;
