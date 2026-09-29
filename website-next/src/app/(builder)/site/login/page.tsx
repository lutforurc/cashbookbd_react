'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, login } from '@/lib/builder-api';

export default function BuilderLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    const data = new FormData(event.currentTarget);
    const loginId = String(data.get('login_id') ?? '');
    const password = String(data.get('password') ?? '');
    const remember = data.get('remember') === 'on';

    try {
      await login(loginId, password, remember);
      router.push('/site');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="b-wrap">
      <div className="b-main b-login">
        <div className="b-card">
          <h1 style={{ fontSize: '1.2rem', marginTop: 0 }}>Website builder</h1>
          <p className="b-muted">Sign in with your company account.</p>

          {error && <div className="b-msg b-msg--err" data-testid="login-error">{error}</div>}

          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label className="b-label" htmlFor="login_id">Email or phone</label>
              <input className="b-input" id="login_id" name="login_id" required autoComplete="username" data-testid="login-id" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="b-label" htmlFor="password">Password</label>
              <input className="b-input" id="password" name="password" type="password" required autoComplete="current-password" data-testid="login-password" />
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <input type="checkbox" name="remember" /> <span className="b-muted">Keep me signed in</span>
            </label>
            <button className="b-btn b-btn--primary" type="submit" disabled={busy} data-testid="login-submit">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
