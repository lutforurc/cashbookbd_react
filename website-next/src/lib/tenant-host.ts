/**
 * Which company host a request should be resolved against.
 *
 * In production the request Host IS the company's host -- that is the mapping
 * Laravel's SiteResolver uses, and nothing here changes it.
 *
 * In development the browser is on `localhost:3000`, which belongs to no
 * company. Rather than guess (picking "the first company" would silently show
 * the wrong company's website in a database holding several), the site host is
 * named explicitly in .env.development:
 *
 *     SITE_HOST=aft.cashbookbd.test
 *
 * An explicitly configured SITE_HOST is used ONLY for a loopback/local host or a
 * request with no host at all. A real company host is always taken at face
 * value, so a multi-company installation still resolves per company.
 */

const LOCAL_HOSTS = new Set(['', 'localhost', '127.0.0.1', '0.0.0.0', '::1']);

export function forcedSiteHost(): string {
  return (process.env.SITE_HOST ?? '').trim().toLowerCase();
}

export function resolveTenantHost(incomingHost: string | null | undefined): string {
  const host = (incomingHost ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .split(':')[0];

  const forced = forcedSiteHost();

  if (forced !== '' && LOCAL_HOSTS.has(host)) {
    return forced;
  }

  return host !== '' ? host : forced;
}
