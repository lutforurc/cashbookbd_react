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
