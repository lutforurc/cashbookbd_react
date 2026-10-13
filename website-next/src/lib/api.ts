import { headers } from 'next/headers';
import { resolveTenantHost } from './tenant-host';

/**
 * Server-side reads of the tenant's public site API.
 *
 * The tenant is decided by the HOST, and over the internal Laravel address the
 * Host header would be 127.0.0.1 -- so the visitor's real host travels in
 * X-Site-Host, the same signal nginx sends in production.
 */
const LARAVEL = process.env.LARAVEL_INTERNAL_URL || 'http://127.0.0.1:8123';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number };

export async function currentHost(): Promise<string> {
  const h = await headers();
  const raw = h.get('x-forwarded-host') ?? h.get('host') ?? '';

  return resolveTenantHost(raw);
}

/** The absolute URL of a path on the host the visitor actually asked for. */
export async function absoluteUrl(path: string): Promise<string> {
  const h = await headers();
  const host = resolveTenantHost(h.get('x-forwarded-host') ?? h.get('host'));
  const proto = h.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  return `${proto}://${host}${path}`;
}

export async function publicGet<T>(path: string): Promise<ApiResult<T>> {
  const host = await currentHost();

  try {
    const res = await fetch(`${LARAVEL}/api/public/site${path}`, {
      headers: { Accept: 'application/json', 'X-Site-Host': host },
      // Frequently edited: always read the published snapshot fresh, and let
      // the CDN hold it briefly.
      cache: 'no-store',
    });

    if (!res.ok) return { ok: false, status: res.status };

    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}
