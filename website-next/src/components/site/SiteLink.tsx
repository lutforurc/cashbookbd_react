import Link from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

/**
 * A link on a company website.
 *
 * ⚠️ A plain `<a href="/about">` asks the BROWSER to load the page, so every
 * click between the site's own pages threw the whole document away and painted
 * it again -- the fonts, the theme, the scroll position, all of it. An internal
 * route goes through next/link instead, which asks the router for the page the
 * server already rendered and swaps it in.
 *
 * Three kinds of link, and only the first one changes:
 *
 *   - an internal path (/about, /products/7): next/link, no document reload
 *   - an external URL, tel:, mailto:, or an in-page #anchor: an ordinary
 *     browser navigation, which is what those are for
 *   - `navigable={false}`: rendered without an href, for the builder's preview,
 *     where a click must not carry the admin off the screen they are editing
 *
 * This is a rendering change only: the pages stay server-rendered, so the
 * titles, canonical URLs and OpenGraph tags are exactly as they were.
 */
function isInternal(href: string): boolean {
  // '//example.com' is protocol-relative and therefore external.
  return href.startsWith('/') && !href.startsWith('//');
}

type Props = {
  href: string;
  children?: ReactNode;
  navigable?: boolean;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

export function SiteLink({ href, children, navigable = true, ...rest }: Props) {
  const url = href || '/';

  // Inside a preview: keep the look, drop the destination.
  if (!navigable) {
    return <a {...rest}>{children}</a>;
  }

  if (isInternal(url)) {
    return <Link href={url} {...rest}>{children}</Link>;
  }

  return <a href={url} {...rest}>{children}</a>;
}

export default SiteLink;
