'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BuilderShell, Forbidden, Notice, useRequireAuth } from '@/components/builder/Shell';
import { ApiError, builderFetch } from '@/lib/builder-api';
import type { BuilderPage, PagesResponse } from '@/lib/site-types';

export default function PagesListPage() {
  const ready = useRequireAuth();
  const router = useRouter();

  const [pages, setPages] = useState<BuilderPage[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await builderFetch<PagesResponse>('/pages');
      setPages(res.pages);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else if (e instanceof ApiError && e.status === 401) router.replace('/site/login');
      else setNotice({ kind: 'err', text: 'Could not load the pages.' });
    }
  }, [router]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      await builderFetch('/pages', { method: 'POST', body: JSON.stringify({ title: newTitle }) });
      setNewTitle('');
      setNotice({ kind: 'ok', text: 'Page added. Open the builder to add sections.' });
      await load();
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not add the page.' });
    } finally {
      setBusy(false);
    }
  }

  async function save(page: BuilderPage, title: string, slug: string, status: boolean) {
    setBusy(true);
    try {
      await builderFetch(`/pages/${page.id}`, { method: 'PUT', body: JSON.stringify({ title, slug, status }) });
      setNotice({ kind: 'ok', text: 'Page updated.' });
      await load();
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not update the page.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(page: BuilderPage) {
    if (!window.confirm(`Delete the page "${page.title}"?`)) return;
    setBusy(true);
    try {
      await builderFetch(`/pages/${page.id}`, { method: 'DELETE' });
      setNotice({ kind: 'ok', text: 'Page removed.' });
      await load();
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not remove the page.' });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (forbidden) return <BuilderShell title="Pages"><Forbidden /></BuilderShell>;

  return (
    <BuilderShell title="Pages">
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      <div className="b-card">
        <form onSubmit={add} className="b-row">
          <div>
            <label className="b-label">New page title</label>
            <input className="b-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                   placeholder="e.g. Our services" data-testid="new-page-title" />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="b-btn b-btn--primary" type="submit" disabled={busy} data-testid="add-page">Add page</button>
          </div>
        </form>
      </div>

      <div className="b-card">
        <table className="b-table">
          <thead>
            <tr><th>Title</th><th>Slug</th><th>Status</th><th>Published</th><th /></tr>
          </thead>
          <tbody>
            {pages.map((page) => <PageRow key={page.id} page={page} busy={busy} onSave={save} onRemove={remove} />)}
          </tbody>
        </table>
      </div>
    </BuilderShell>
  );
}

function PageRow({
  page,
  busy,
  onSave,
  onRemove,
}: {
  page: BuilderPage;
  busy: boolean;
  onSave: (page: BuilderPage, title: string, slug: string, status: boolean) => void;
  onRemove: (page: BuilderPage) => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [status, setStatus] = useState(page.status !== 0);

  return (
    <tr>
      <td><input className="b-input" value={title} onChange={(e) => setTitle(e.target.value)} /></td>
      <td><input className="b-input" value={slug} onChange={(e) => setSlug(e.target.value)} /></td>
      <td>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={status} onChange={(e) => setStatus(e.target.checked)} /> live
        </label>
      </td>
      <td>{page.is_published ? 'yes' : 'no'}{page.is_home ? ' · home' : ''}</td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <Link className="b-btn" href={`/site/pages/${page.id}/builder`}>Builder</Link>{' '}
        <Link className="b-btn" href={`/site/pages/${page.id}/preview`}>Preview</Link>{' '}
        <button className="b-btn" disabled={busy} onClick={() => onSave(page, title, slug, status)}>Save</button>{' '}
        {!page.is_home && (
          <button className="b-btn b-btn--danger" disabled={busy} onClick={() => onRemove(page)}>Delete</button>
        )}
      </td>
    </tr>
  );
}
