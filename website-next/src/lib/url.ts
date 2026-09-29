/**
 * Media is always served by the same tenant host as the page, so an absolute
 * URL Laravel built from APP_URL is turned back into a same-origin path. That
 * keeps a logo, a product image or an uploaded picture working in development
 * (where the app host and the frontend host differ) without any per-environment
 * config.
 */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

/** A path taken from a site's media map ('site_media/1/x.jpg'). */
export function mediaPathUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('/') ? path : '/' + path;
}
