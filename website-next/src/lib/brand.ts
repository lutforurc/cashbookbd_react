import type { Seo } from './site-types';

/** Laravel's Str::headline, for the subdomain fallback brand. */
export function headline(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * The same rules the Blade layout used, so a page's title and metadata do not
 * change when the renderer does:
 *
 *   brand     = the merged SEO title, or the headline of the subdomain
 *   pageTitle = brand on the home page, else "{page title} — {brand}"
 */
export function brandOf(siteSeo: Seo, pageSeo: Seo | undefined, fallback: string): string {
  const merged = { ...siteSeo, ...(pageSeo ?? {}) };
  const title = (merged.title ?? '').trim();
  return title !== '' ? title : fallback;
}

export function pageTitle(isHome: boolean, pageTitle: string, brand: string): string {
  return isHome ? brand : `${pageTitle} — ${brand}`;
}

export function mergeSeo(siteSeo: Seo, pageSeo: Seo | undefined): Seo {
  return { ...siteSeo, ...(pageSeo ?? {}) };
}

/**
 * The site's own name, on its own.
 *
 * ⚠️ Deliberately NOT merged with the page's SEO title. The page's title is
 * "About us"; the brand is "Meghna Retail & Electronics". Merging them made the
 * brand change from page to page, so the header, og:site_name and the suffix of
 * every <title> read "About us" — the company's name nowhere.
 */
export function siteBrand(siteSeo: Seo, fallback: string): string {
  return brandOf(siteSeo, undefined, fallback);
}

/** "About us — Meghna Retail & Electronics", from the page's own title. */
export function pageHeading(page: { title: string; seo?: Seo }, brand: string): string {
  const own = (page.seo?.title ?? '').trim() || page.title;

  return `${own} — ${brand}`;
}

/** The page's own description, and the site's only when the page has none. */
export function descriptionFor(siteSeo: Seo, pageSeo: Seo | undefined): string | undefined {
  const own = (pageSeo?.description ?? '').trim();

  return (own || (siteSeo.description ?? '').trim()) || undefined;
}
