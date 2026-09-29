/**
 * The browser side of the builder: sign in, and talk to /api/site with the
 * bearer token Sanctum minted.
 *
 * The token lives in the same `_trio_lead_token` cookie the admin SPA uses, so
 * the two apps share one session concept and the same tradeoff (a cookie the JS
 * can read). Same-origin `/api/...` is proxied to Laravel by nginx in
 * production and by next.config.mjs in development.
 */
export const TOKEN_COOKIE = '_trio_lead_token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(new RegExp('(?:^|; )' + TOKEN_COOKIE + '=([^;]*)'));

  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string, remember = false): void {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  const maxAge = remember ? '; Max-Age=' + 60 * 60 * 24 * 30 : '';

  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${maxAge}${secure}`;
}

export function clearToken(): void {
  document.cookie = `${TOKEN_COOKIE}=; Path=/; Max-Age=0`;
}

export async function login(loginId: string, password: string, remember: boolean): Promise<void> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: loginId, phone: loginId, mobile: loginId, password }),
    credentials: 'same-origin',
  });

  const body = await res.json().catch(() => ({} as Record<string, unknown>));

  if (!res.ok) {
    const error = (body as { error?: { message?: string }; message?: string });
    throw new ApiError(res.status, error?.error?.message ?? error?.message ?? 'Sign in failed.');
  }

  const token = (body as { data?: { token?: string } })?.data?.token;
  if (!token) throw new ApiError(500, 'No token was returned.');

  setToken(token, remember);
}

export async function builderFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const res = await fetch(`/api/site${path}`, { ...init, headers, credentials: 'same-origin' });

  if (res.status === 401) throw new ApiError(401, 'Please sign in again.');
  if (res.status === 403) throw new ApiError(403, 'You are not permitted to perform this action.');
  if (res.status === 404) throw new ApiError(404, 'Not found.');

  if (res.status === 422) {
    const body = await res.json().catch(() => ({} as Record<string, unknown>));
    const error = body as { message?: string; errors?: Record<string, string[]> };
    const first = error.errors ? Object.values(error.errors)[0]?.[0] : undefined;
    throw new ApiError(422, first ?? error.message ?? 'Please check the form.');
  }

  if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status}).`);

  return (await res.json()) as T;
}
