import { SiteFooter, SiteHeader } from '@/components/site/Chrome';
import { brandOf } from '@/lib/brand';
import { getShell } from '@/lib/site-data';
import { mediaUrl } from '@/lib/url';

// Frequently edited: always render from the published snapshot rather than a
// build-time page.
export const dynamic = 'force-dynamic';

const GOOGLE_FONTS: Record<string, string> = {
  inter: 'Inter:wght@400;600;700',
  poppins: 'Poppins:wght@400;600;700',
  roboto: 'Roboto:wght@400;500;700',
  merri: 'Merriweather:wght@400;700',
};

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const shell = await getShell();

  // No resolvable site (disabled, or nobody has published): render the page
  // bare -- the page itself decides to redirect or 404.
  if (!shell.ok) {
    return <>{children}</>;
  }

  const site = shell.data.site;
  const brand = brandOf(site.seo, undefined, site.brand_fallback);

  const families = Array.from(new Set([site.theme.heading_font, site.theme.body_font]))
    .filter((key) => GOOGLE_FONTS[key]);

  const fontHref = families.length
    ? `https://fonts.googleapis.com/css2?${families.map((k) => `family=${GOOGLE_FONTS[k]}`).join('&')}&display=swap`
    : null;

  return (
    <>
      {/* Laravel's own SiteTheme::css(), injected verbatim so the design tokens
          and the Blade rendering cannot drift. */}
      <style dangerouslySetInnerHTML={{ __html: site.theme_css }} />
      {fontHref && <link rel="stylesheet" href={fontHref} />}

      <div className={`btnstyle-${site.theme.button_style || 'solid'}`}>
        <a className="skip-link" href="#main">Skip to content</a>

        <SiteHeader
          brand={brand}
          logoUrl={mediaUrl(site.logo_url)}
          nav={site.nav}
          headerStyle={site.theme.header_style}
        />

        <main id="main">{children}</main>

        <SiteFooter brand={brand} footer={site.footer} />
      </div>
    </>
  );
}
