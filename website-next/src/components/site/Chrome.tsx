import SiteLink from '@/components/site/SiteLink';
import type { NavItem, SiteFooter as Footer, SiteTheme } from '@/lib/site-types';

/**
 * The header/nav, mirroring resources/views/site/partials/nav.blade.php.
 *
 * Links go through SiteLink so the site's own pages are reached with the
 * router (no full document reload); `navigable={false}` is what the builder's
 * preview passes, so a click there does not leave the editor.
 */
export function SiteHeader({
  brand,
  logoUrl,
  nav,
  headerStyle,
  navigable = true,
}: {
  brand: string;
  logoUrl: string | null;
  nav: NavItem[];
  headerStyle: SiteTheme['header_style'];
  navigable?: boolean;
}) {
  return (
    <header className={`site-header header-${headerStyle || 'light'}`}>
      <div className="container header-inner">
        <SiteLink className="brand" href="/" navigable={navigable}>
          {logoUrl ? <img src={logoUrl} alt={brand} height={38} /> : <span>{brand}</span>}
        </SiteLink>

        {nav.length > 0 && (
          <nav className="site-nav" aria-label="Main navigation">
            {nav.map((item, i) => (
              <SiteLink href={item.url || '/'} navigable={navigable} key={i}>{item.label}</SiteLink>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

/** The footer, mirroring resources/views/site/partials/footer.blade.php. */
export function SiteFooter({
  brand,
  footer,
  navigable = true,
}: {
  brand: string;
  footer: Footer;
  navigable?: boolean;
}) {
  const social = Object.entries({
    Facebook: footer.facebook,
    Instagram: footer.instagram,
    YouTube: footer.youtube,
    WhatsApp: footer.whatsapp,
  }).filter(([, url]) => Boolean(url));

  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <strong>{brand}</strong>
          {footer.about && <p className="muted">{footer.about}</p>}
          {social.length > 0 && (
            <p>
              {social.map(([label, url], i) => (
                <span key={label}>
                  {/* Social profiles are elsewhere on the web: a normal navigation. */}
                  <a href={url} rel="noopener">{label}</a>
                  {i < social.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </p>
          )}
        </div>

        {footer.links.length > 0 && (
          <div>
            <strong>Links</strong>
            <ul>
              {footer.links.map((link, i) => (
                <li key={i}>
                  <SiteLink href={link.url || '/'} navigable={navigable}>{link.label}</SiteLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="container copyright">
        {footer.copyright || `© ${year} ${brand}`}
      </div>
    </footer>
  );
}
