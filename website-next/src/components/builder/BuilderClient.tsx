'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { FieldEditor, type FieldCtx } from '@/components/builder/Fields';
import { BuilderShell, Forbidden, Notice, useRequireAuth } from '@/components/builder/Shell';
import { ApiError, builderFetch } from '@/lib/builder-api';
import type { BuilderPayload, FieldDef, Section, SectionDef } from '@/lib/site-types';

function defaultsFor(fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === 'group') out[field.key] = defaultsFor(field.fields ?? []);
    else if (field.type === 'repeater') out[field.key] = [];
    else if (field.type === 'bool') out[field.key] = field.default ?? false;
    else out[field.key] = field.default ?? '';
  }
  return out;
}

function blankSection(def: SectionDef): Section {
  return {
    id: 'sec_' + Math.random().toString(36).slice(2, 10),
    type: def.type,
    enabled: true,
    props: defaultsFor(def.fields),
  };
}

export default function BuilderClient({ pageId }: { pageId: number }) {
  const ready = useRequireAuth();
  const router = useRouter();

  const [payload, setPayload] = useState<BuilderPayload | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await builderFetch<BuilderPayload>(`/pages/${pageId}`);
      setPayload(res);
      setSections(res.content.sections ?? []);
      setSelected(res.content.sections?.[0]?.id ?? null);
      setDirty(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else if (e instanceof ApiError && e.status === 401) router.replace('/site/login');
      else if (e instanceof ApiError && e.status === 404) setNotice({ kind: 'err', text: 'That page does not exist.' });
      else setNotice({ kind: 'err', text: 'Could not load the page.' });
    }
  }, [pageId, router]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  function update(sectionId: string, patch: Partial<Section>) {
    setSections((list) => list.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
    setDirty(true);
  }

  function move(index: number, delta: number) {
    setSections((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const copy = list.slice();
      const tmp = copy[index];
      copy[index] = copy[target];
      copy[target] = tmp;
      return copy;
    });
    setDirty(true);
  }

  function addSection(type: string) {
    const def = payload?.schema.find((s) => s.type === type);
    if (!def) return;
    const section = blankSection(def);
    setSections((list) => [...list, section]);
    setSelected(section.id);
    setDirty(true);
  }

  function removeSection(id: string) {
    setSections((list) => list.filter((s) => s.id !== id));
    setDirty(true);
  }

  async function saveDraft() {
    setBusy(true);
    setNotice(null);
    try {
      await builderFetch(`/pages/${pageId}/draft`, {
        method: 'POST',
        body: JSON.stringify({ content: { version: 1, sections } }),
      });
      setNotice({ kind: 'ok', text: 'Draft saved.' });
      setDirty(false);
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not save the draft.' });
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setNotice(null);
    try {
      if (dirty) await saveDraft();
      const res = await builderFetch<{ message?: string }>(`/pages/${pageId}/publish`, { method: 'POST' });
      setNotice({ kind: 'ok', text: res.message ?? 'Page published.' });
      await load();
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not publish.' });
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (!window.confirm('Discard your draft edits and go back to the published page?')) return;
    setBusy(true);
    try {
      await builderFetch(`/pages/${pageId}/discard`, { method: 'POST' });
      await load();
      setNotice({ kind: 'ok', text: 'Draft discarded.' });
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not discard.' });
    } finally {
      setBusy(false);
    }
  }

  async function resetSection(id: string) {
    setBusy(true);
    try {
      await builderFetch(`/pages/${pageId}/reset-section`, { method: 'POST', body: JSON.stringify({ section_id: id }) });
      await load();
      setNotice({ kind: 'ok', text: 'Section reset to its default.' });
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not reset.' });
    } finally {
      setBusy(false);
    }
  }

  async function uploadMedia(file: File | null) {
    if (!file) return;
    setBusy(true);
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await builderFetch<{ id: number; url: string; path: string }>('/media', { method: 'POST', body });
      setPayload((p) => (p ? { ...p, media: [{ id: res.id, url: res.url, path: res.path, alt: null, width: null, height: null }, ...p.media] } : p));
      setNotice({ kind: 'ok', text: 'Image uploaded.' });
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Upload failed.' });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  const title = payload ? `Builder — ${payload.page.title}` : 'Builder';

  if (forbidden) return <BuilderShell title={title}><Forbidden /></BuilderShell>;
  if (!payload) return <BuilderShell title={title}><p className="b-muted">Loading…</p></BuilderShell>;

  const active = sections.find((s) => s.id === selected) ?? null;
  const ctx: FieldCtx = { media: payload.media, iconOptions: payload.icon_options };

  return (
    <BuilderShell title={title}>
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      <div className="b-card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="b-btn b-btn--primary" disabled={busy} onClick={saveDraft} data-testid="save-draft">Save draft</button>
        <button className="b-btn" disabled={busy} onClick={publish} data-testid="publish-page">Publish</button>
        <button className="b-btn b-btn--danger" disabled={busy} onClick={discard}>Discard draft</button>
        <Link className="b-btn" href={`/site/pages/${pageId}/preview`} data-testid="open-preview">Preview</Link>
        <Link className="b-btn" href="/site/pages">← Pages</Link>
        {dirty && <span className="b-pill">unsaved</span>}
      </div>

      <div className="b-row" style={{ alignItems: 'flex-start' }}>
        <div className="b-card" style={{ flex: '1 1 340px' }}>
          <h2 style={{ fontSize: '1rem', marginTop: 0 }}>Sections</h2>

          <ul className="b-sections">
            {sections.map((section, index) => (
              <li key={section.id} className={`b-section${section.id === selected ? ' is-active' : ''}`} data-testid="section-item">
                <div className="b-section-head">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1} aria-label="Move down">↓</button>
                  <button type="button" className="grow" onClick={() => setSelected(section.id)}>
                    {payload.schema.find((s) => s.type === section.type)?.label ?? section.type}
                  </button>
                  <span className="b-pill">{section.type}</span>
                  <label title="Enabled">
                    <input type="checkbox" checked={section.enabled} onChange={(e) => update(section.id, { enabled: e.target.checked })} />
                  </label>
                  <button type="button" onClick={() => resetSection(section.id)} title="Reset to default">reset</button>
                  <button type="button" className="b-btn--danger" onClick={() => removeSection(section.id)} title="Remove">✕</button>
                </div>

                {section.id === selected && (
                  <div className="b-editor">
                    {(payload.schema.find((s) => s.type === section.type)?.fields ?? []).map((field) => (
                      <div key={field.key} style={{ marginBottom: 12 }}>
                        <FieldEditor
                          field={field}
                          value={(section.props as Record<string, unknown>)[field.key]}
                          onChange={(next) => update(section.id, { props: { ...section.props, [field.key]: next } })}
                          ctx={ctx}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 12 }}>
            <label className="b-label">Add a section</label>
            <select className="b-select" value="" onChange={(e) => e.target.value && addSection(e.target.value)} data-testid="add-section">
              <option value="">— choose a section —</option>
              {payload.schema.map((def) => <option value={def.type} key={def.type}>{def.label}</option>)}
            </select>
          </div>
        </div>

        <div className="b-card" style={{ flex: '1 1 300px' }}>
          <h2 style={{ fontSize: '1rem', marginTop: 0 }}>Media</h2>
          <input type="file" accept="image/*" onChange={(e) => uploadMedia(e.target.files?.[0] ?? null)} data-testid="upload-media" />
          <div className="b-media-grid" style={{ marginTop: 12 }}>
            {payload.media.map((m) => <img src={m.url} alt={m.alt ?? ''} key={m.id} />)}
          </div>

          <h2 style={{ fontSize: '1rem', marginTop: 20 }}>History</h2>
          <ul className="b-muted" style={{ paddingLeft: 18 }}>
            {payload.revisions.map((r) => (
              <li key={r.id}>{r.label ?? 'Revision'} <span style={{ opacity: .7 }}>{r.created_at ?? ''}</span></li>
            ))}
            {payload.revisions.length === 0 && <li>No revisions yet.</li>}
          </ul>

          {active && (
            <>
              <h2 style={{ fontSize: '1rem', marginTop: 20 }}>Page</h2>
              <p className="b-muted">Slug: /{payload.page.slug} · {payload.page.is_published ? 'published' : 'not published'}</p>
            </>
          )}
        </div>
      </div>
    </BuilderShell>
  );
}
