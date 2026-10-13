import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */

// The tenant's own Laravel install. Over the internal address the Host header
// would be 127.0.0.1, so every server-side call also forwards the visitor's
// real host in X-Site-Host (see src/lib/api.ts).
const LARAVEL = process.env.LARAVEL_INTERNAL_URL || 'http://127.0.0.1:8123';

// Locally there is no nginx splitting the paths, so the browser's same-origin
// /api and /sanctum calls have to be proxied here. In production nginx sends
// those straight to Laravel and this is switched off.
const DEV_PROXY = process.env.NEXT_DEV_PROXY === '1';

const nextConfig = {
  // A small, self-contained server bundle to drop beside each tenant's Laravel.
  output: 'standalone',
  // The admin SPA's lockfile lives one directory up; keep the standalone bundle
  // rooted at this app rather than at the whole repo.
  outputFileTracingRoot: appRoot,
  // Tenant media is served by Laravel at /site_media/...; leave it alone rather
  // than routing it through the image optimiser.
  images: { unoptimized: true },
  poweredByHeader: false,
  async rewrites() {
    if (!DEV_PROXY) return { beforeFiles: [] };

    // beforeFiles: these are matched BEFORE the app's own routes, so /login
    // cannot be swallowed by the public site's /[slug] page route.
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${LARAVEL}/api/:path*` },
        { source: '/sanctum/:path*', destination: `${LARAVEL}/sanctum/:path*` },
        { source: '/site_media/:path*', destination: `${LARAVEL}/site_media/:path*` },
        // The application's own auth screens, so /login is reachable locally just
        // as nginx routes it in production. Everything else (/ , /about, ...) is
        // the public website and is served by Next.
        { source: '/login', destination: `${LARAVEL}/login` },
        { source: '/logout', destination: `${LARAVEL}/logout` },
      ],
    };
  },
};

export default nextConfig;
