'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearToken, getToken } from '@/lib/builder-api';

/**
 * The builder chrome, and the one place that decides whether there is a
 * session. A missing token sends the visitor to the builder's own sign-in page
 * (the application's /login belongs to the admin panel, not to this app).
 */
export function useRequireAuth(): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/site/login');
      return;
    }
    setReady(true);
  }, [router]);

  return ready;
}

export function BuilderShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();

  function signOut() {
    clearToken();
    router.push('/site/login');
  }

  return (
    <div className="b-wrap">
      <div className="b-top">
        <strong>Website builder</strong>
        <Link href="/site">Setup</Link>
        <Link href="/site/templates">Templates</Link>
        <Link href="/site/pages">Pages</Link>
        <Link href="/site/products">Products</Link>
        <Link href="/site/messages">Messages</Link>
        <span className="spacer" />
        <a href="/" target="_blank" rel="noreferrer">View site</a>
        <button className="b-btn" type="button" onClick={signOut}>Sign out</button>
      </div>

      <div className="b-main">
        <h1 style={{ fontSize: '1.4rem' }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Notice({ kind, children }: { kind: 'ok' | 'err'; children: React.ReactNode }) {
  return <div className={`b-msg b-msg--${kind}`} data-testid={`notice-${kind}`}>{children}</div>;
}

/** Rendered when the API said 403 -- the permission is not held. */
export function Forbidden() {
  return (
    <div className="b-card" data-testid="forbidden">
      <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Not permitted</h2>
      <p className="b-muted">Your account does not have permission to manage the company website.</p>
    </div>
  );
}
