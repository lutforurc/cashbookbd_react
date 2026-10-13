'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BuilderShell, Forbidden, Notice, useRequireAuth } from '@/components/builder/Shell';
import { ApiError, builderFetch } from '@/lib/builder-api';
import type { SetupResponse, SiteTheme } from '@/lib/site-types';

export default function SetupPage() {
  const ready = useRequireAuth();
  const router = useRouter();

  const [data, setData] = useState<SetupResponse | null>(null);
  const [theme, setTheme] = useState<SiteTheme | null>(null);
  const [form, setForm] = useState({ subdomain: '', custom_domain: '', status: false, seo_title: '', seo_description: '' });
  const [template, setTemplate] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await builderFetch<SetupResponse>('');
      setData(res);
      setTheme(res.site.theme);
      setForm({
        subdomain: res.site.subdomain,
        custom_domain: res.site.custom_domain ?? '',
        status: res.site.status === 1,
        seo_title: res.site.seo.title ?? '',
        seo_description: res.site.seo.description ?? '',
      });
      setTemplate(Object.keys(res.templates)[0] ?? '');
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else if (e instanceof ApiError && e.status === 401) router.replace('/site/login');
      else setNotice({ kind: 'err', text: 'Could not load the website.' });
    }
  }, [router]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  async function post(path: string, body?: unknown, okText = 'Saved.') {
    setBusy(true);
    setNotice(null);
    try {
      const res = await builderFetch<{ message?: string }>(path, {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      setNotice({ kind: 'ok', text: res.message ?? okText });
      await load();
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  }

  async function upload(field: 'logo' | 'favicon', file: File | null) {
    if (!file) return;
    setBusy(true);
    setNotice(null);
    const body = new FormData();
    body.append('file', file);
    try {
      await builderFetch(`/${field}`, { method: 'POST', body });
      setNotice({ kind: 'ok', text: 'Uploaded. Remember to publish.' });
      await load();
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Upload failed.' });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (forbidden) return <BuilderShell title="Website setup"><Forbidden /></BuilderShell>;
  if (!data || !theme) return <BuilderShell title="Website setup"><p className="b-muted">Loading…</p></BuilderShell>;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setT = <K extends keyof SiteTheme>(key: K, value: SiteTheme[K]) => setTheme((t) => (t ? { ...t, [key]: value } : t));

  return (
    <BuilderShell title="Website setup">
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      <div className="b-card">
        <div className="b-row">
          <div><span className="b-label">Pages</span>{data.counts.pages}</div>
          <div><span className="b-label">Products shown</span>{data.counts.products}</div>
          <div><span className="b-label">Unread messages</span>{data.counts.unread_messages}</div>
          <div><span className="b-label">Media</span>{data.counts.media}</div>
        </div>
        <p className="b-muted" style={{ marginTop: 12 }}>
          Public address: <a href={data.public_url} target="_blank" rel="noreferrer">{data.public_url}</a>
          {data.site.has_been_published ? ' · published' : ' · not published yet'}
        </p>
      </div>

      <div className="b-card">
        <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>Template</h2>
        <div className="b-row">
          <div>
            <label className="b-label">Start from</label>
            <select className="b-select" value={template} onChange={(e) => setTemplate(e.target.value)}>
              {Object.entries(data.templates).map(([key, t]) => <option value={key} key={key}>{t.label}</option>)}
            </select>
            <p className="b-muted" style={{ marginTop: 6 }}>{data.templates[template]?.description}</p>
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="b-btn" disabled={busy} onClick={() => post('/template', { template }, 'Template applied to your draft.')}>
              Apply to draft
            </button>
          </div>
        </div>
      </div>

      <div className="b-card">
        <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>Identity</h2>
        <div className="b-row">
          <div>
            <label className="b-label">Subdomain</label>
            <input className="b-input" value={form.subdomain} onChange={(e) => set('subdomain', e.target.value)} />
          </div>
          <div>
            <label className="b-label">Custom domain</label>
            <input className="b-input" value={form.custom_domain} onChange={(e) => set('custom_domain', e.target.value)} />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={form.status} onChange={(e) => set('status', e.target.checked)} />
              <span className="b-label" style={{ margin: 0 }}>Enabled</span>
            </label>
          </div>
        </div>
      </div>

      <div className="b-card">
        <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>Theme</h2>
        <div className="b-row">
          {(['primary_color', 'secondary_color', 'accent_color', 'text_color', 'bg_color'] as const).map((token) => (
            <div key={token}>
              <label className="b-label">{token.replace(/_/g, ' ')}</label>
              <input className="b-input" type="color" value={String(theme[token])} onChange={(e) => setT(token, e.target.value as never)} />
            </div>
          ))}
        </div>
        <div className="b-row" style={{ marginTop: 12 }}>
          <div>
            <label className="b-label">Heading font</label>
            <select className="b-select" value={theme.heading_font} onChange={(e) => setT('heading_font', e.target.value)}>
              {Object.entries(data.fonts).map(([k, f]) => <option value={k} key={k}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="b-label">Body font</label>
            <select className="b-select" value={theme.body_font} onChange={(e) => setT('body_font', e.target.value)}>
              {Object.entries(data.fonts).map(([k, f]) => <option value={k} key={k}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="b-label">Corner radius</label>
            <input className="b-input" type="number" min={0} max={32} value={theme.base_radius}
                   onChange={(e) => setT('base_radius', Number(e.target.value))} />
          </div>
        </div>
        <div className="b-row" style={{ marginTop: 12 }}>
          <div>
            <label className="b-label">Button style</label>
            <select className="b-select" value={theme.button_style} onChange={(e) => setT('button_style', e.target.value as never)}>
              <option value="solid">Solid</option><option value="outline">Outline</option><option value="pill">Pill</option>
            </select>
          </div>
          <div>
            <label className="b-label">Container width</label>
            <select className="b-select" value={theme.container_width} onChange={(e) => setT('container_width', e.target.value as never)}>
              <option value="narrow">Narrow</option><option value="normal">Normal</option>
              <option value="wide">Wide</option><option value="full">Full</option>
            </select>
          </div>
          <div>
            <label className="b-label">Header style</label>
            <select className="b-select" value={theme.header_style} onChange={(e) => setT('header_style', e.target.value as never)}>
              <option value="light">Light</option><option value="dark">Dark</option><option value="transparent">Transparent</option>
            </select>
          </div>
        </div>
      </div>

      <div className="b-card">
        <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>SEO</h2>
        <div className="b-row">
          <div>
            <label className="b-label">Title</label>
            <input className="b-input" maxLength={70} value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} />
          </div>
          <div>
            <label className="b-label">Description</label>
            <input className="b-input" maxLength={170} value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="b-card">
        <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>Brand images</h2>
        <div className="b-row">
          <div>
            <label className="b-label">Logo</label>
            <input type="file" accept="image/*" onChange={(e) => upload('logo', e.target.files?.[0] ?? null)} />
            {data.site.logo_url && <img src={data.site.logo_url} alt="Logo" style={{ maxHeight: 44, marginTop: 8 }} />}
          </div>
          <div>
            <label className="b-label">Favicon</label>
            <input type="file" accept="image/*" onChange={(e) => upload('favicon', e.target.files?.[0] ?? null)} />
            {data.site.favicon_url && <img src={data.site.favicon_url} alt="Favicon" style={{ maxHeight: 32, marginTop: 8 }} />}
          </div>
        </div>
      </div>

      <div className="b-card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="b-btn" disabled={busy} data-testid="save-settings"
                onClick={() => post('/settings', {
                  subdomain: form.subdomain,
                  custom_domain: form.custom_domain,
                  status: form.status,
                  theme,
                  seo: { title: form.seo_title, description: form.seo_description },
                }, 'Saved. These changes are in your draft until you publish.')}>
          Save draft
        </button>
        <button className="b-btn b-btn--primary" disabled={busy} data-testid="publish-site"
                onClick={() => post('/publish', undefined, 'Published. Your website is live.')}>
          Publish
        </button>
        <Link className="b-btn" href="/site/templates">Browse templates →</Link>
        <Link className="b-btn" href="/site/pages">Manage pages →</Link>
      </div>
    </BuilderShell>
  );
}
