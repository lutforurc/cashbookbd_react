'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BuilderShell, Forbidden, Notice, useRequireAuth } from '@/components/builder/Shell';
import { ApiError, builderFetch } from '@/lib/builder-api';
import type { ProductRow, ProductsAdminResponse } from '@/lib/site-types';

export default function ProductsPage() {
  const ready = useRequireAuth();
  const router = useRouter();

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [meta, setMeta] = useState<ProductsAdminResponse['meta'] | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (q: string) => {
    try {
      const res = await builderFetch<ProductsAdminResponse>(`/products${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setRows(res.products);
      setMeta(res.meta);
      setSearch(res.search);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else if (e instanceof ApiError && e.status === 401) router.replace('/site/login');
      else setNotice({ kind: 'err', text: 'Could not load the products.' });
    }
  }, [router]);

  useEffect(() => { if (ready) void load(query); }, [ready, query, load]);

  async function save(row: ProductRow, patch: Partial<{ selected: boolean; is_featured: boolean; override_title: string; override_price: string }>) {
    setBusy(true);
    setNotice(null);
    try {
      await builderFetch('/products/save', {
        method: 'POST',
        body: JSON.stringify({
          product_id: row.id,
          selected: patch.selected ?? row.selected,
          is_featured: patch.is_featured ?? (row.site?.is_featured ?? false),
          override_title: patch.override_title ?? (row.site?.override_title ?? ''),
          override_price: patch.override_price ?? (row.site?.override_price ?? ''),
        }),
      });
      setNotice({ kind: 'ok', text: 'Product saved. Publish to update your website.' });
      await load(query);
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: ProductRow) {
    setBusy(true);
    try {
      await builderFetch('/products/remove', { method: 'POST', body: JSON.stringify({ product_id: row.id }) });
      await load(query);
      setNotice({ kind: 'ok', text: 'Product removed from the website.' });
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not remove.' });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (forbidden) return <BuilderShell title="Products"><Forbidden /></BuilderShell>;

  return (
    <BuilderShell title="Products on the website">
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      <form className="b-card b-row" onSubmit={(e) => { e.preventDefault(); setQuery(search); }}>
        <div>
          <label className="b-label">Search your products</label>
          <input className="b-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or code" data-testid="product-search" />
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button className="b-btn b-btn--primary" type="submit">Search</button>
        </div>
      </form>

      <div className="b-card">
        <table className="b-table">
          <thead>
            <tr><th>Product</th><th>Price</th><th>Shown</th><th>Featured</th><th>Title override</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((row) => <ProductRowItem key={row.id} row={row} busy={busy} onSave={save} onRemove={remove} />)}
            {rows.length === 0 && <tr><td colSpan={6} className="b-muted">No products found.</td></tr>}
          </tbody>
        </table>
        {meta && <p className="b-muted" style={{ marginTop: 10 }}>Page {meta.current_page} of {meta.last_page} · {meta.total} products</p>}
      </div>
    </BuilderShell>
  );
}

function ProductRowItem({
  row,
  busy,
  onSave,
  onRemove,
}: {
  row: ProductRow;
  busy: boolean;
  onSave: (row: ProductRow, patch: Partial<{ selected: boolean; is_featured: boolean; override_title: string; override_price: string }>) => void;
  onRemove: (row: ProductRow) => void;
}) {
  const [selected, setSelected] = useState(row.selected);
  const [featured, setFeatured] = useState(row.site?.is_featured ?? false);
  const [title, setTitle] = useState(row.site?.override_title ?? '');
  const [price, setPrice] = useState(row.site?.override_price ?? '');

  return (
    <tr>
      <td>{row.name}<br /><span className="b-muted">{row.code}</span></td>
      <td>{row.sales_price ?? '—'}</td>
      <td><input type="checkbox" checked={selected} onChange={(e) => setSelected(e.target.checked)} aria-label={`Show ${row.name}`} /></td>
      <td><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} aria-label={`Feature ${row.name}`} /></td>
      <td><input className="b-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="(use product name)" /></td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <button className="b-btn" disabled={busy} onClick={() => onSave(row, { selected, is_featured: featured, override_title: title, override_price: price })}>Save</button>{' '}
        <button className="b-btn b-btn--danger" disabled={busy} onClick={() => onRemove(row)}>Remove</button>
      </td>
    </tr>
  );
}
