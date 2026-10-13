import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantHost } from '@/lib/tenant-host';

/**
 * Local-dev only. There is no nginx in front of `next dev`, so the browser's
 * same-origin /api calls are proxied to Laravel by next.config.mjs -- but the
 * proxied request would arrive with Host 127.0.0.1 and Laravel could not tell
 * one company from another. This copies the company host into X-Site-Host,
 * exactly as nginx does in production.
 *
 * resolveTenantHost() supplies the explicitly configured SITE_HOST for a
 * loopback host, so localhost:3000 talks to the company named in
 * .env.development rather than to whatever site happens to be first.
 */
export function middleware(req: NextRequest) {
  const host = resolveTenantHost(req.headers.get('host'));

  const headers = new Headers(req.headers);
  headers.set('x-site-host', host);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/api/:path*'],
};
