import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

/**
 * Laravel calls this after a publish so the frontend drops the pages it had
 * cached. Guarded by a shared secret; the public pages are server-rendered
 * fresh anyway, so a missed call costs nothing but a warm cache.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;

  const body = (await request.json().catch(() => ({}))) as { secret?: string; paths?: unknown };

  if (!secret || body.secret !== secret) {
    return Response.json({ ok: false, message: 'Unauthorized.' }, { status: 401 });
  }

  const paths = Array.isArray(body.paths) ? body.paths : ['/', '/products'];

  const revalidated: string[] = [];
  for (const path of paths) {
    if (typeof path === 'string' && path.startsWith('/')) {
      revalidatePath(path);
      revalidated.push(path);
    }
  }

  return Response.json({ ok: true, revalidated });
}
